import * as k8s from '@kubernetes/client-node';

import navSectionNames from '@constants/navSectionNames';

import {optionalExplicitNamespaceMatcher, targetKindMatcher} from '@src/kindhandlers/common/customMatchers';

import {ResourceKindHandler} from '@monokle-desktop/shared';
import {K8sResource} from '@monokle-desktop/shared';

const EndpointsHandler: ResourceKindHandler = {
  kind: 'Endpoints',
  apiVersionMatcher: '**',
  isNamespaced: true,
  navigatorPath: [navSectionNames.K8S_RESOURCES, navSectionNames.NETWORK, 'Endpoints'],
  clusterApiVersion: 'v1',
  validationSchemaPrefix: 'io.k8s.api.core.v1',
  isCustom: false,
  getResourceFromCluster(kubeconfig: k8s.KubeConfig, resource: K8sResource): Promise<any> {
    const k8sCoreV1Api = kubeconfig.makeApiClient(k8s.CoreV1Api);
    return k8sCoreV1Api.readNamespacedEndpoints(resource.name, resource.namespace || 'default', 'true');
  },
  async listResourcesInCluster(kubeconfig: k8s.KubeConfig, {namespace}) {
    const k8sCoreV1Api = kubeconfig.makeApiClient(k8s.CoreV1Api);
    const response = namespace
      ? await k8sCoreV1Api.listNamespacedEndpoints(namespace)
      : await k8sCoreV1Api.listEndpointsForAllNamespaces();
    return response.body.items;
  },
  async deleteResourceInCluster(kubeconfig: k8s.KubeConfig, resource: K8sResource) {
    const k8sCoreV1Api = kubeconfig.makeApiClient(k8s.CoreV1Api);
    await k8sCoreV1Api.deleteNamespacedEndpoints(resource.name, resource.namespace || 'default');
  },
  outgoingRefMappers: [
    {
      source: {
        pathParts: ['metadata', 'name'],
      },
      target: {
        kind: 'Service',
      },
      type: 'name',
    },
    {
      source: {
        pathParts: ['targetRef', 'name'],
        siblingMatchers: {
          namespace: optionalExplicitNamespaceMatcher,
          kind: targetKindMatcher,
        },
      },
      target: {
        kind: '$.*',
      },
      type: 'name',
    },
  ],
  helpLink: 'https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.22/#endpoints-v1-core',
};

export default EndpointsHandler;
