import {groupBy} from 'lodash';
import {createSelector} from 'reselect';

import {SavedCommand} from '@models/appconfig';
import {RootState} from '@models/rootstate';

import {kustomizationsSelector, selectCurrentKubeConfig} from '@redux/selectors';
import {canTransfer} from '@redux/services/compare/transferResource';

import {ComparisonListItem} from '@components/organisms/CompareModal/types';

import {isDefined} from '@utils/filter';

import {getResourceKindHandler} from '@src/kindhandlers';

import {
  CompareSide,
  CompareState,
  CompareStatus,
  PartialResourceSet,
  ResourceComparison,
  TransferDirection,
} from './state';

export const selectCompareStatus = (state: CompareState): CompareStatus => {
  const c = state.current;

  const empty = !c.left && !c.right;
  const leftSuccess = c.left && !c.left.loading && !c.left.error;
  const rightSuccess = c.right && !c.right.loading && !c.right.error;
  if (empty || !leftSuccess || !rightSuccess) {
    return 'selecting';
  }

  if (c.transfering.pending) {
    return 'transfering';
  }

  return c.inspect ? 'inspecting' : 'comparing';
};

export const selectResourceSet = (state: CompareState, side: CompareSide): PartialResourceSet | undefined => {
  return side === 'left' ? state.current.view.leftSet : state.current.view.rightSet;
};

export const selectClusterResourceSet = (state: RootState, side: CompareSide) => {
  const resourceSet = selectResourceSet(state.compare, side);
  if (resourceSet?.type !== 'cluster') return undefined;
  const {context} = resourceSet;

  const kubeConfig = selectCurrentKubeConfig(state);
  const allContexts = kubeConfig.contexts ?? [];
  const currentContext = allContexts.find(c => c.name === context);

  return {
    currentContext,
    allContexts,
  };
};

export const selectGitResourceSet = (state: RootState, side: CompareSide) => {
  const resourceSet = selectResourceSet(state.compare, side);
  if (resourceSet?.type !== 'git' || !state.git.repo) {
    return undefined;
  }

  const branchName = resourceSet.branchName;

  const allGitBranches = Object.values(state.git.repo.branchMap);
  const currentGitBranch = branchName ? state.git.repo.branchMap[branchName] : undefined;
  const currentGitBranchCommits = currentGitBranch?.commits || [];
  const currentCommit = currentGitBranchCommits.find(c => c.hash === resourceSet.commitHash);

  return {allGitBranches, currentCommit, currentGitBranch, currentGitBranchCommits};
};

export const selectCommandResourceSet = (state: RootState, side: CompareSide) => {
  const resourceSet = selectResourceSet(state.compare, side);
  if (resourceSet?.type !== 'command') {
    return undefined;
  }
  const {commandId} = resourceSet;

  const allSavedCommands = Object.values(state.config.projectConfig?.savedCommandMap || {}).filter(
    (command): command is SavedCommand => Boolean(command)
  );
  let currentCommand = commandId ? state.config.projectConfig?.savedCommandMap?.[commandId] : undefined;
  currentCommand = currentCommand !== null ? currentCommand : undefined;

  return {allSavedCommands, currentCommand};
};

export const selectHelmResourceSet = (state: RootState, side: CompareSide) => {
  const resourceSet = selectResourceSet(state.compare, side);
  if (resourceSet?.type !== 'helm' && resourceSet?.type !== 'helm-custom') {
    return undefined;
  }
  const chartId = resourceSet.chartId;

  const allHelmCharts = Object.values(state.main.helmChartMap);
  const currentHelmChart = chartId ? state.main.helmChartMap[chartId] : undefined;
  const availableHelmValues = currentHelmChart
    ? Object.values(state.main.helmValuesMap).filter(values => currentHelmChart.valueFileIds.includes(values.id))
    : [];
  const availableHelmConfigs = Object.values(state.config.projectConfig?.helm?.previewConfigurationMap ?? {})
    .filter(isDefined)
    .filter(config => config.helmChartFilePath === currentHelmChart?.filePath);

  const currentHelmValuesOrConfig =
    resourceSet.type === 'helm'
      ? availableHelmValues.find(v => v.id === resourceSet.valuesId)
      : availableHelmConfigs.find(c => c.id === resourceSet.configId);

  return {
    allHelmCharts,
    currentHelmChart,
    availableHelmValues,
    availableHelmConfigs,
    currentHelmValuesOrConfig,
  };
};

export const selectKustomizeResourceSet = (state: RootState, side: CompareSide) => {
  const resourceSet = selectResourceSet(state.compare, side);
  if (resourceSet?.type !== 'kustomize') return undefined;
  const {kustomizationId} = resourceSet;

  const currentKustomization = kustomizationId ? state.main.resourceMap[kustomizationId] : undefined;
  const allKustomizations = kustomizationsSelector(state);

  return {allKustomizations, currentKustomization};
};

export const selectComparison = (state: CompareState, id: string | undefined): ResourceComparison | undefined => {
  if (!id) return undefined;
  return state.current.comparison?.comparisons.find(c => c.id === id);
};

export const selectKnownNamespaces = createSelector(
  (state: CompareState) => state.current.left,
  (state: CompareState) => state.current.right,
  (left, right) => {
    const set = new Set();
    left?.resources.forEach(r => set.add(r.namespace ?? 'default'));
    right?.resources.forEach(r => set.add(r.namespace ?? 'default'));
    return Array.from(set.values());
  }
);
export const selectIsComparisonSelected = (state: CompareState, id: string): boolean => {
  return state.current.selection.some(comparisonId => comparisonId === id);
};

export const selectIsAllComparisonSelected = (state: CompareState): boolean => {
  return (
    !state.current.comparison?.loading &&
    state.current.selection.length === state.current.comparison?.comparisons.length
  );
};

export const selectCanTransfer = (state: CompareState, direction: TransferDirection, ids: string[]): boolean => {
  // Cannot transfer in invalid state.
  const status = selectCompareStatus(state);
  if (status === 'selecting' || status === 'transfering' || ids.length === 0) {
    return false;
  }

  // Cannot transfer when the resource set type is non-transferable.
  const left = state.current.view.leftSet?.type;
  const right = state.current.view.rightSet?.type;
  const isTransferable = direction === 'left-to-right' ? canTransfer(left, right) : canTransfer(right, left);
  if (!isTransferable) {
    return false;
  }

  // Can only transfer if all selected items are transferable.
  const comparisons = state.current.filtering?.comparisons ?? [];
  const transferable = comparisons
    .filter(comparison => ids.some(id => id === comparison.id))
    .filter(comparison => (direction === 'left-to-right' ? comparison.left : comparison.right));
  return ids.length === transferable.length;
};

export const selectComparisonListItems = createSelector(
  (state: CompareState) => state.current.filtering?.comparisons,
  (state: CompareState) => [state.current.view.leftSet?.type, state.current.view.rightSet?.type],
  (state: CompareState) => state.current.view.namespace,
  (comparisons = [], [leftType, rightType], defaultNamespace) => {
    const result: ComparisonListItem[] = [];

    const leftTransferable = canTransfer(leftType, rightType);
    const rightTransferable = canTransfer(rightType, leftType);

    const groups = groupBy(comparisons, r => {
      if (r.isMatch) return r.left.kind;
      return r.left ? r.left.kind : r.right.kind;
    });

    Object.entries(groups).forEach(([kind, comps]) => {
      result.push({type: 'header', kind, count: comps.length});
      const isNamespaced = getResourceKindHandler(kind)?.isNamespaced ?? true;

      comps.forEach(comparison => {
        if (comparison.isMatch) {
          result.push({
            type: 'comparison',
            id: comparison.id,
            name: comparison.left.name,
            namespace: isNamespaced ? comparison.left.namespace ?? defaultNamespace ?? 'default' : undefined,
            leftActive: true,
            rightActive: true,
            leftTransferable: leftTransferable && comparison.isDifferent,
            rightTransferable: rightTransferable && comparison.isDifferent,
            canDiff: comparison.isDifferent,
          });
        } else {
          result.push({
            type: 'comparison',
            id: comparison.id,
            name: comparison.left?.name ?? comparison.right?.name ?? 'unknown',
            namespace: isNamespaced
              ? comparison.left?.namespace ?? comparison.right?.namespace ?? defaultNamespace ?? 'default'
              : undefined,
            leftActive: isDefined(comparison.left),
            rightActive: isDefined(comparison.right),
            leftTransferable: leftTransferable && isDefined(comparison.left),
            rightTransferable: rightTransferable && isDefined(comparison.right),
            canDiff: false,
          });
        }
      });
    });

    return result;
  }
);
