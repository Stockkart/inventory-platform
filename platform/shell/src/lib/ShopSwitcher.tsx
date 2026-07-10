import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { useAuthStore } from '@inventory-platform/session';
import type { ShopMembership } from '@inventory-platform/session/types';
import { Box, Button, Text, cn, shellChrome } from '@inventory-platform/ui-kit';

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
        className={shellChrome.shopSwitcherTrigger}
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
          className={cn(shellChrome.shopChevron, open && shellChrome.shopChevronOpen)}
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
          className={shellChrome.shopDropdown}
        >
          <Text
            as="span"
            variant="caption"
            color="secondary"
            weight="semibold"
            className={shellChrome.shopDropdownLabel}
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
              className={cn(
                shellChrome.shopDropdownItem,
                s.shopId === activeShopId && shellChrome.shopDropdownItemActive,
              )}
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
            className={shellChrome.shopDropdownAdd}
          >
            + Add another shop
          </Button>
        </Box>
      ) : null}
    </Box>
  );
}
