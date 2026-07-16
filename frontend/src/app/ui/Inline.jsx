import PropTypes from 'prop-types';
import styles from './Inline.module.css';

export default function Inline({ gap, align, justify, className = '', children, ...props }) {
  const classes = [
    styles.root,
    gap && styles[`gap-${gap}`],
    align && styles[`align-${align}`],
    justify && styles[`justify-${justify}`],
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
}

Inline.propTypes = {
  gap: PropTypes.oneOf(['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl']),
  align: PropTypes.oneOf(['start', 'center', 'end']),
  justify: PropTypes.oneOf(['start', 'center', 'end', 'between', 'around']),
  className: PropTypes.string,
  children: PropTypes.node,
};
