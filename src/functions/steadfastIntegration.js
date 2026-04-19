// Stub for steadfastIntegration — self-hosted mode
export async function steadfastIntegration(data) {
    console.log('[steadfastIntegration] Steadfast courier API not configured', data);
    return { success: false, message: 'Steadfast integration not configured. Please add API credentials.' };
}
export default steadfastIntegration;
