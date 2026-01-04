export const formatCurrency = (amount: number): string => {
  return `UGX ${amount.toLocaleString('en-UG')}`;
};
