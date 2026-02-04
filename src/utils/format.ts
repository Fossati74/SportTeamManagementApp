export const formatPrice = (amount: number): string => {
  return amount % 1 === 0 ? `${amount}` : amount.toFixed(2);
};

export const formatPlayerName = (firstName: string, lastName: string) => {
  return `${firstName} ${lastName}`;
};