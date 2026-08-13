import { useState } from 'react';
import Modal from '@/components/shared/Modal';
import Button from '@/components/shared/Button';
import Badge from '@/components/shared/Badge';
import { useToast } from '@/context/ToastContext';
import { Zap, CheckCircle2, ImageOff } from 'lucide-react';

export default function RedeemModal({ isOpen, onClose, item, userBalance, onConfirm, isLoading }) {
  const toast = useToast();
  const [redeemed, setRedeemed] = useState(false);
  const [imgError, setImgError] = useState(false);

  if (!item) return null;

  const balanceAfter = userBalance - item.points_cost;
  const canAfford = userBalance >= item.points_cost;

  const handleConfirm = async () => {
    if (!canAfford || isLoading) return; // Edge-Case 4.1 & 4.2: double protection

    try {
      await onConfirm({ catalogItemId: item.id, pointsCost: item.points_cost });
      setRedeemed(true);
      toast.success(`Successfully redeemed "${item.name}"!`);

      // Auto-close after showing success
      setTimeout(() => {
        setRedeemed(false);
        onClose();
      }, 2000);
    } catch (err) {
      // Edge-Case 4.1: server-side rejection (balance dropped between click and confirm)
      if (err.message?.toLowerCase().includes('insufficient')) {
        toast.error('Insufficient points. Your balance may have changed.');
      } else {
        toast.error(err.message || 'Failed to redeem reward.');
      }
    }
  };

  // Edge-Case 4.10: clean close at any time
  const handleClose = () => {
    setRedeemed(false);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={redeemed ? 'Redeemed!' : 'Confirm Redemption'} size="md">
      {redeemed ? (
        // Success state
        <div className="text-center py-6 animate-scale-in">
          <div className="mx-auto w-16 h-16 rounded-full bg-[var(--color-secondary-50)] dark:bg-emerald-900/30 flex items-center justify-center mb-4">
            <CheckCircle2 className="w-8 h-8 text-[var(--color-secondary-600)] dark:text-emerald-400" />
          </div>
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">
            You redeemed {item.name}!
          </h3>
          <p className="text-sm text-[var(--text-secondary)] mt-2">
            {item.points_cost.toLocaleString()} points have been deducted from your balance.
          </p>
        </div>
      ) : (
        // Confirmation state
        <div className="space-y-5">
          {/* Item preview */}
          <div className="flex gap-4 p-4 rounded-xl bg-[var(--bg-tertiary)]">
            <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-[var(--bg-secondary)]">
              {item.image_url && !imgError ? (
                <img
                  src={item.image_url}
                  alt={item.name}
                  onError={() => setImgError(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageOff className="w-6 h-6 text-[var(--text-tertiary)]" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-[var(--text-primary)] truncate">{item.name}</h3>
              {item.category && <Badge variant="primary" className="mt-1">{item.category}</Badge>}
              {item.description && (
                <p className="text-sm text-[var(--text-secondary)] mt-1 line-clamp-2">{item.description}</p>
              )}
            </div>
          </div>

          {/* Balance breakdown */}
          <div className="space-y-3 p-4 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-primary)]">
            <div className="flex justify-between text-sm">
              <span className="text-[var(--text-secondary)]">Current balance</span>
              <span className="font-medium text-[var(--text-primary)]">{userBalance.toLocaleString()} pts</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[var(--text-secondary)]">Reward cost</span>
              <span className="font-medium text-[var(--color-danger-600)]">-{item.points_cost.toLocaleString()} pts</span>
            </div>
            <hr className="border-[var(--border-secondary)]" />
            <div className="flex justify-between text-sm">
              <span className="font-medium text-[var(--text-primary)]">Balance after</span>
              <span className={`font-bold ${balanceAfter >= 0 ? 'text-[var(--color-secondary-600)]' : 'text-[var(--color-danger-600)]'}`}>
                {balanceAfter.toLocaleString()} pts
              </span>
            </div>
          </div>

          {/* Warning if balance is insufficient (race condition) */}
          {!canAfford && (
            <div className="p-3 rounded-lg bg-[var(--color-danger-50)] text-[var(--color-danger-600)] text-sm">
              You no longer have enough points to redeem this reward.
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={handleClose}>Cancel</Button>
            <Button
              variant="primary"
              onClick={handleConfirm}
              loading={isLoading}
              disabled={!canAfford || isLoading}
              icon={Zap}
            >
              Confirm Redeem
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
