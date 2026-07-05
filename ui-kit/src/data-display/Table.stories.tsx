import type { Meta, StoryObj } from '@storybook/react';
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeaderCell,
  TableCell,
  TableEmptyRow,
  TableLoadingRow,
} from './Table';

const meta: Meta = {
  title: 'Data display/Table',
};

export default meta;

export const Basic: StoryObj = {
  render: () => (
    <Table>
      <TableHead>
        <TableRow>
          <TableHeaderCell>Name</TableHeaderCell>
          <TableHeaderCell>Phone</TableHeaderCell>
          <TableHeaderCell>Status</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        <TableRow>
          <TableCell>Acme Pharma</TableCell>
          <TableCell>+91 98765 43210</TableCell>
          <TableCell>Active</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>City Distributors</TableCell>
          <TableCell>+91 91234 56789</TableCell>
          <TableCell>Active</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  ),
};

export const Loading: StoryObj = {
  render: () => (
    <Table>
      <TableHead>
        <TableRow>
          <TableHeaderCell>Name</TableHeaderCell>
          <TableHeaderCell>Phone</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        <TableLoadingRow colSpan={2} label="Loading vendors…" />
      </TableBody>
    </Table>
  ),
};

export const Empty: StoryObj = {
  render: () => (
    <Table>
      <TableHead>
        <TableRow>
          <TableHeaderCell>Name</TableHeaderCell>
          <TableHeaderCell>Phone</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        <TableEmptyRow colSpan={2} message="No vendors match your search." />
      </TableBody>
    </Table>
  ),
};
