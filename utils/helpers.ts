
// Utility to deep access object properties by string path "data.price"
export const getNestedValue = (obj: any, path: string): any => {
  return path.split('.').reduce((acc, part) => acc && acc[part], obj);
};
