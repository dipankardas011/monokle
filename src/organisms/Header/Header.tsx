import * as React from 'react';
import {Container, Row, Col} from 'react-bootstrap';
import styled from 'styled-components';

import { useAppSelector } from '../../redux/hooks';

const Title = styled.h4`
  font-size: 1.5em;
  text-align: left;
  color: tomato;
`;

const EditorMode = styled.h4`
  font-size: 1.0em;
  text-align: right;
  color: blue;
`;

const StyledRow = styled(Row)`
  border: 3px solid blue;
  border-radius: 2px;
  background: papayawhip;
`;

const StyledRowPreviewMode = styled(Row)`
  border: 3px solid tomato;
  border-radius: 2px;
  background: grey;
`;

const Header = () => {
  const isInPreviewMode = useAppSelector(state => state.main.previewResource) ? true : false;

  return (
  <Container fluid>
    <Row as={isInPreviewMode? StyledRowPreviewMode : StyledRow}>
      <Col sm={6}>
        <Title>ManifestUI / Monokle logo</Title>
      </Col>
      <Col sm={6}>
        <EditorMode>{ isInPreviewMode ? "Preview": "" }</EditorMode>
      </Col>
    </Row>
  </Container>
)};

export default Header;
