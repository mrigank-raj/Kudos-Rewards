import { useState } from 'react';
import Modal from '../shared/Modal';
import Button from '../shared/Button';
import { useKudos } from '../../hooks/useKudos';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../context/ToastContext';

export default function GiveKudosModal({ isOpen, onClose }) {
  const [toUserId, setToUserId] = useState('');
  const [message, setMessage] = useState('');
  const [points, setPoints] = useState('');
  
  const { recipients, loadingRecipients, sendKudos, isSending } = useKudos();
  const { profile } = useAuth();
  const { addToast } = useToast();

  // Guard against null profile initially
  const maxPoints = profile?.points_balance || 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!toUserId) {
      addToast('error', 'Please select a colleague.');
      return;
    }
    
    const numPoints = parseInt(points || '0', 10);
    
    if (numPoints < 0) {
      addToast('error', 'Points cannot be negative.');
      return;
    }
    
    if (numPoints > maxPoints) {
      addToast('error', `You only have ${maxPoints} points available.`);
      return;
    }

    try {
      await sendKudos({ toUserId, message, points: numPoints });
      addToast('success', 'Kudos sent successfully!');
      // Reset form
      setToUserId('');
      setMessage('');
      setPoints('');
      onClose();
    } catch (err) {
      console.error(err);
      addToast('error', err.message || 'Failed to send Kudos');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Give Kudos">
      <form onSubmit={handleSubmit} className="space-y-4 mt-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Who do you want to recognize?
          </label>
          <select
            value={toUserId}
            onChange={(e) => setToUserId(e.target.value)}
            disabled={loadingRecipients}
            className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
            required
          >
            <option value="" disabled>Select a colleague...</option>
            {recipients?.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Message
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
            rows={3}
            placeholder="Thanks for helping me fix that bug! You're awesome."
            required
            maxLength={500}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Attach Points (Optional)
          </label>
          <div className="relative">
            <input
              type="number"
              value={points}
              onChange={(e) => setPoints(e.target.value)}
              min="0"
              max={maxPoints}
              className="w-full pl-8 pr-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
              placeholder="0"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-500 dark:text-gray-400 font-bold">✨</span>
            </div>
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Available balance: <span className="font-semibold text-blue-600 dark:text-blue-400">{maxPoints} pts</span>
          </p>
        </div>

        <div className="pt-4 flex space-x-3">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" className="flex-1" disabled={isSending}>
            {isSending ? 'Sending...' : 'Send Kudos'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
