import { MarketingSection, StatBlock, StatsRow } from '@inventory-platform/ui-kit';

export function Stats() {
  const stats = [
    { value: '99.9%', label: 'Uptime' },
    { value: '---', label: 'Active Users', placeholder: true },
    { value: '---', label: 'Products Tracked', placeholder: true },
    { value: '24/7', label: 'Support' },
  ];

  return (
    <MarketingSection tone="canvas" density="compact">
      <StatsRow>
        {stats.map((stat) => (
          <StatBlock
            key={stat.label}
            value={stat.value}
            label={stat.label}
            placeholder={stat.placeholder}
          />
        ))}
      </StatsRow>
    </MarketingSection>
  );
}
