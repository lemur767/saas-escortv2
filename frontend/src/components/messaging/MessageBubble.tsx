// src/components/messaging/MessageBubble.tsx
import { format } from 'date-fns';
import type { Message } from '../../types';

interface MessageBubbleProps {
  message: Message;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const { content, is_incoming, ai_generated, timestamp, is_flagged } = message;
  
  // Format timestamp
  const messageTime = new Date(timestamp);
  const formattedTime = format(messageTime, 'h:mm a');
  
  return (
    <div className={`flex mb-4 ${is_incoming ? 'justify-start' : 'justify-end'}`}>
      <div 
        className={`max-w-md px-4 py-2 rounded-lg ${
          is_incoming 
            ? 'message-bubble-incoming' 
            : 'message-bubble-outgoing'
        } ${is_flagged ? 'border-2 border-amber-500' : ''}`}
      >
        <p className="mb-1">{content}</p>
        <div className="flex items-center justify-end space-x-1 text-xs opacity-70">
          <span>{formattedTime}</span>
          {!is_incoming && ai_generated && (
            <span className="ml-1 bg-indigo-800 text-white px-1 rounded text-xs">AI</span>
          )}
          {is_flagged && (
            <span className="ml-1 bg-amber-600 text-white px-1 rounded text-xs">Flagged</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;