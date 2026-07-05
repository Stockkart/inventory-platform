import type { Meta, StoryObj } from '@storybook/react';
import { Alert } from './Alert';
import { Badge } from './Badge';
import { Spinner } from './Spinner';
import { Inline } from '../layout/Stack';

const meta: Meta = {
  title: 'Feedback/Status',
};

export default meta;

export const Alerts: StoryObj = {
  render: () => (
    <>
      <Alert variant="info">Inventory sync completed.</Alert>
      <Alert variant="warning">3 items are below threshold.</Alert>
      <Alert variant="danger">Failed to save changes.</Alert>
    </>
  ),
};

export const Badges: StoryObj = {
  render: () => (
    <Inline gap="sm">
      <Badge>Default</Badge>
      <Badge variant="success">Active</Badge>
      <Badge variant="warning">Pending</Badge>
      <Badge variant="danger">Expired</Badge>
    </Inline>
  ),
};

export const SpinnerSizes: StoryObj = {
  render: () => (
    <Inline gap="md">
      <Spinner size="sm" />
      <Spinner size="md" />
      <Spinner size="lg" />
    </Inline>
  ),
};
