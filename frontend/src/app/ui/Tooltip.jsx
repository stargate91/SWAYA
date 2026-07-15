import PropTypes from 'prop-types';
import * as RadixTooltip from '@radix-ui/react-tooltip';
import './Tooltip.css';

export default function Tooltip({
  content,
  className = '',
  side = 'top',
  delay = 600,
  children,
}) {
  if (!content) return children;

  return (
    <RadixTooltip.Provider delayDuration={delay}>
      <RadixTooltip.Root>
        <RadixTooltip.Trigger asChild>
          <span className="ui-tooltip">
            {children}
          </span>
        </RadixTooltip.Trigger>
        <RadixTooltip.Portal>
          <RadixTooltip.Content
            className={`ui-tooltip__content ${className}`.trim()}
            side={side}
            sideOffset={10}
          >
            {content}
          </RadixTooltip.Content>
        </RadixTooltip.Portal>
      </RadixTooltip.Root>
    </RadixTooltip.Provider>
  );
}

Tooltip.propTypes = {
  content: PropTypes.node,
  className: PropTypes.string,
  side: PropTypes.oneOf(['top', 'bottom', 'left', 'right']),
  delay: PropTypes.number,
  children: PropTypes.node.isRequired,
};
