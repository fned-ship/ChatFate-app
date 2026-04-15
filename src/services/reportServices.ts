import api from './api'; // Assuming your axios instance is saved in api.js


export const getAllReports = async () => {
  try {
    const response = await api.get('/api/reports');
    return response.data;
  } catch (error) {
    console.error('Error fetching reports:', error);
    throw error.response?.data || error.message;
  }
};


export const addReport = async (reportDetails, files = []) => {
  try {
    const formData = new FormData();
    
    // Append standard text fields
    formData.append('reportedId', reportDetails.reportedId);
    formData.append('report', reportDetails.report);
    if (reportDetails.importance) {
      formData.append('importance', reportDetails.importance);
    }

    // Append files if they exist (matches 'upload.array("files")' on backend)
    if (files && files.length > 0) {
      // Convert FileList to Array if necessary
      Array.from(files).forEach((file) => {
        formData.append('files', file); 
      });
    }

    // Axios automatically sets the 'Content-Type': 'multipart/form-data' 
    // boundary when it detects a FormData object.
    const response = await api.post('/api/reports', formData);
    return response.data;
  } catch (error) {
    console.error('Error submitting report:', error);
    throw error.response?.data || error.message;
  }
};

/
export const takeReportAction = async (reportId, actionData) => {
  try {
    const response = await api.post(`/api/reports/${reportId}/action`, actionData);
    return response.data;
  } catch (error) {
    console.error('Error taking action on report:', error);
    throw error.response?.data || error.message;
  }
};