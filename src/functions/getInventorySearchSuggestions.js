// Stub: getInventorySearchSuggestions - self-hosted mode
export async function getInventorySearchSuggestions(data) {
  console.log('[getInventorySearchSuggestions] Called:', JSON.stringify(data)?.substring(0,100));
  return { success: false, message: 'Function getInventorySearchSuggestions not implemented in self-hosted mode.' };
}
export default getInventorySearchSuggestions;
