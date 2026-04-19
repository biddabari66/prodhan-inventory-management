// Stub: revertInventoryOnCancel - self-hosted mode
export async function revertInventoryOnCancel(data) {
  console.log('[revertInventoryOnCancel] Called:', JSON.stringify(data)?.substring(0,100));
  return { success: false, message: 'Function revertInventoryOnCancel not implemented in self-hosted mode.' };
}
export default revertInventoryOnCancel;
