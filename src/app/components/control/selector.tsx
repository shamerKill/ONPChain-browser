import { FC, HTMLAttributes, ReactElement, useState } from 'react';
import { formatClass, getOnlyId } from '../../../tools';
import ComConSvg from './icon';

export type TypeComponentsControlSelector = {
  select: number;
  options: (string|ReactElement)[];
  onSelfSelect?: (select: number) => unknown;
};

const ComConSelector: FC<TypeComponentsControlSelector & HTMLAttributes<HTMLDivElement>> = ({
  className,
  select,
  options,
  onSelfSelect,
}) => {
  const [showOptions, setShowOptions] = useState(false);

  const changeSelect = (num: number) => {
    if (num === select) return;
    onSelfSelect?.(num);
    setShowOptions(false);
  };

  return (
    <div className={formatClass(['control-select', className])}>
      <button
        className={formatClass(['control-select-select'])}
        onClick={() => setShowOptions(state => !state)}>
        { options[select] }
        <ComConSvg className="control-select-icon" xlinkHref="#icon-more" />
      </button>
      <div className={formatClass(['control-select-options', !showOptions && 'control-select-options-hide'])}>
        {
          options.map((item, index) => (
            <button
              key={getOnlyId()}
              className={formatClass(['control-select-option'])}
              onClick={() => changeSelect(index)}>
              { item }
            </button>
          ))
        }
      </div>
    </div>
  );
};

export default ComConSelector;
