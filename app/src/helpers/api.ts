import toast from "react-hot-toast";

export const callApi = async (
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    token: string | null,
    body: Record<string, any> | null = null,
) => {
   if(!token) {
    toast.error('Athentication Error: Please log in again.');
    throw new Error('No token provided for API call.');
   }

   const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
   }

   const options: RequestInit = {
    method,
    headers,
   };

   if (body) {
    options.body = JSON.stringify(body);
   }
   try {
    const response = await fetch(`/api/${endpoint}`, options);

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown server error' }));
        const errorMessage = errorData.error || 'Network request failed';
        toast.error(errorMessage);
        throw new Error(errorMessage);
    }
    return await response.json();
   } catch (error) {
    toast.error('An error occurred during API call: Network request failed');
    throw error;
   }
}

