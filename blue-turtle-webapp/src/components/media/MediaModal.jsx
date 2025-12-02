// src/components/media/MediaModal.jsx
import Modal from '../ui/Modal';
import MediaCard from './MediaCard';

export default function MediaModal({ isOpen, onClose, item }) {
  if (!item) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="p-4">
        <MediaCard item={item} />
      </div>
    </Modal>
  );
}