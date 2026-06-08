export const UploadFile = async (file) => {
  console.log('UploadFile mock', file);
  return { url: 'mock_url' };
};

export const ExtractDataFromUploadedFile = async (fileUrl) => {
  console.log('ExtractDataFromUploadedFile mock', fileUrl);
  return { data: [] };
};

export const InvokeLLM = async (prompt) => {
  console.log('InvokeLLM mock', prompt);
  return { response: 'mock_llm_response' };
};

export const SendEmail = async (params) => {
  console.log('SendEmail mock', params);
  return { success: true };
};
