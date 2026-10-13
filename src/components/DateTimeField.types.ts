export type DateTimeFieldProps = {
  label: string;
  value: Date;
  onChange: (value: Date) => void;
  /** 'date' hides the time picker. */
  mode?: 'datetime' | 'date';
  maximumDate?: Date;
};
