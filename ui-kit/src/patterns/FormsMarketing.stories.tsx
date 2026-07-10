import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { PackagingFactorField, type PackagingUnitOption } from './PackagingFactorField';
import { FileDropzoneContainer, fileDropzone } from './FileDropzone';
import { SocialAuthSlot } from './SocialAuthSlot';
import { PlanCarousel3D } from './PlanCarousel3D';
import { Box, Stack, Text } from '../layout';
import { Button, Label } from '../forms';
import { Badge } from '../feedback';
import { Card, CardBody } from '../data-display';

const meta: Meta = {
  title: 'Patterns/Forms & marketing',
};

export default meta;

const PACKAGING_UNITS: PackagingUnitOption[] = [
  { uqc: 'NOS', label: 'Numbers' },
  { uqc: 'TBS', label: 'Tablets' },
  { uqc: 'BTL', label: 'Bottles' },
  { uqc: 'BOX', label: 'Boxes' },
];

export const PackagingFactor: StoryObj = {
  render: function PackagingFactorStory() {
    const [baseUnit, setBaseUnit] = useState('TBS');
    const [factor, setFactor] = useState(10);
    return (
      <Stack gap="md" style={{ maxWidth: 420 }}>
        <PackagingFactorField
          packagingUnits={PACKAGING_UNITS}
          baseUnit={baseUnit}
          factor={factor}
          onChange={(unit, nextFactor) => {
            setBaseUnit(unit);
            setFactor(nextFactor);
          }}
          hint="1 × factor unit (e.g. 1 × 10 TBS)"
        />
        <Text variant="caption" color="secondary">
          baseUnit={baseUnit}, factor={factor}
        </Text>
      </Stack>
    );
  },
};

export const FileDropzone: StoryObj = {
  render: () => (
    <Stack gap="md" style={{ maxWidth: 480 }}>
      <Text variant="title">FileDropzone</Text>
      <FileDropzoneContainer>
        <Box className={fileDropzone.optionLabel}>
          <Text as="span" className={fileDropzone.optionTitle}>
            Upload invoice images
          </Text>
          <Text as="span" className={fileDropzone.optionSubtitle}>
            PNG or JPG, multi-page supported
          </Text>
        </Box>
        <Box className={fileDropzone.controls}>
          <Label className={fileDropzone.fileInputLabel}>
            <Box className={fileDropzone.placeholder}>
              <Text as="span" className={fileDropzone.placeholderIcon}>
                📤
              </Text>
              <Text as="span">Click to browse images</Text>
            </Box>
          </Label>
          <Box className={fileDropzone.actions}>
            <Button type="button" className={fileDropzone.uploadBtn} disabled>
              Parse Invoice
            </Button>
          </Box>
        </Box>
      </FileDropzoneContainer>
    </Stack>
  ),
};

export const SocialAuth: StoryObj = {
  render: () => (
    <Stack gap="md" style={{ maxWidth: 360 }}>
      <Text variant="title">SocialAuthSlot</Text>
      <Text variant="caption" color="secondary">
        Full-width wrapper for third-party OAuth buttons (Google, etc.).
      </Text>
      <SocialAuthSlot>
        <Button type="button" variant="outline" style={{ width: '100%' }}>
          Continue with Google
        </Button>
      </SocialAuthSlot>
    </Stack>
  ),
};

type PlanItem = { id: string; name: string; price: string; highlight?: boolean };

const PLANS: PlanItem[] = [
  { id: 'starter', name: 'Starter', price: '₹499/mo' },
  { id: 'growth', name: 'Growth', price: '₹999/mo', highlight: true },
  { id: 'pro', name: 'Pro', price: '₹1,999/mo' },
  { id: 'enterprise', name: 'Enterprise', price: 'Custom' },
];

export const PlanCarousel: StoryObj = {
  render: () => (
    <Stack gap="md">
      <Text variant="title">PlanCarousel3D</Text>
      <PlanCarousel3D
        items={PLANS}
        getSlideKey={(item, cloneIndex) => `${item.id}-${cloneIndex}`}
        renderSlide={(item, ctx) => (
          <Card
            style={{
              width: '100%',
              height: '100%',
              transform: ctx.isCenter ? 'scale(1)' : 'scale(0.92)',
              opacity: ctx.isCenter ? 1 : 0.75,
              border: item.highlight ? '2px solid var(--sk-color-accent, #4f46e5)' : undefined,
            }}
          >
            <CardBody>
              <Stack gap="sm" align="center" style={{ textAlign: 'center', padding: '1rem' }}>
                {item.highlight ? <Badge variant="info">Popular</Badge> : null}
                <Text variant="heading3">{item.name}</Text>
                <Text weight="bold">{item.price}</Text>
                <Button variant={ctx.isCenter ? 'solid' : 'outline'} size="sm">
                  Choose
                </Button>
              </Stack>
            </CardBody>
          </Card>
        )}
      />
    </Stack>
  ),
};
