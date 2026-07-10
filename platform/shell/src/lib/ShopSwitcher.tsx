import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { useAuthStore } from '@inventory-platform/session';
import type { ShopMembership } from '@inventory-platform/session/types';
import { Box, Button, Text } from '@inventory-platform/ui-kit';

export function ShopSwitcher() {
  const navigate = useNavigate();
  const { user, shop, switchActiveShop, isLoading } = useAuthStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLElement>(null);

  const shops = user?.shops ?? [];
  const hasShops = shops.length >= 1 || !!user?.shopId;
  const activeShopId = user?.shopId ?? null;

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  if (!hasShops) return null;

  const handleSelect = async (s: ShopMembership) => {
    if (s.shopId === activeShopId) {
      setOpen(false);
      return;
    }
    try {
      await switchActiveShop(s.shopId);
      setOpen(false);
    } catch {
      // Error shown via store; keep dropdown open so user can retry
    }
  };

  return (
    <Box ref={ref} position="relative">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen((o) => !o)}
        disabled={isLoading}
        title={shop?.name ?? 'Switch shop'}
        style={{ maxWidth: 180, display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
      >
        <Text as="span" aria-hidden>
          🏪{' '}
        </Text>
        <Text as="span" truncate>
          {shop?.name ?? 'Select shop'}
        </Text>
        <Text
          as="span"
          aria-hidden
          style={{
            fontSize: '0.7rem',
            opacity: 0.7,
            transform: open ? 'rotate(180deg)' : undefined,
            transition: 'transform 0.2s',
          }}
        >
          ▾
        </Text>
      </Button>

      {open ? (
        <Box
          position="absolute"
          bg="elevated"
          border
          rounded="md"
          overflow="hidden"
          style={{
            right: 0,
            top: 'calc(100% + 8px)',
            minWidth: 220,
            maxWidth: 280,
            zIndex: 1000,
            boxShadow: 'var(--sk-shadow-lg)',
          }}
        >
          <Text
            as="span"
            variant="caption"
            color="secondary"
            weight="semibold"
            style={{
              display: 'block',
              padding: '0.5rem 1rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              borderBottom: '1px solid var(--sk-color-border-default)',
            }}
          >
            Your shops
          </Text>
          {shops.map((s) => (
            <Button
              key={s.shopId}
              type="button"
              variant="ghost"
              fullWidth
              onClick={() => handleSelect(s)}
              disabled={isLoading}
              style={{
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: '0.15rem',
                padding: '0.75rem 1rem',
                borderRadius: 0,
                ...(s.shopId === activeShopId
                  ? {
                      background: 'var(--sk-color-accent-soft)',
                      color: 'var(--sk-color-accent)',
                    }
                  : undefined),
              }}
            >
              <Text as="span" weight="medium">
                {s.shopName}
              </Text>
              <Text as="span" variant="caption" color="secondary">
                {s.role}
              </Text>
            </Button>
          ))}
          <Button
            type="button"
            variant="ghost"
            fullWidth
            onClick={() => {
              setOpen(false);
              navigate('/onboarding', { state: { addShop: true } });
            }}
            style={{
              padding: '0.75rem 1rem',
              borderRadius: 0,
              borderTop: '1px solid var(--sk-color-border-default)',
              color: 'var(--sk-color-accent)',
              justifyContent: 'flex-start',
            }}
          >
            + Add another shop
          </Button>
        </Box>
      ) : null}
    </Box>
  );
}
