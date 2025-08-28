// FIXED VERSION of uploadDocument function for DriverService.ts
// Replace the blob conversion section with this:

// Instead of blob conversion, use FormData for React Native
console.log('🔄 Preparing file for upload...');

// For React Native, we need to use FormData instead of blob
const formData = new FormData();
formData.append('file', {
  uri: file.uri,
  type: file.type,
  name: fileName,
} as any);

console.log(`✅ FormData prepared - filename: ${fileName}, type: ${file.type}`);

// Upload to Supabase Storage using FormData
console.log('☁️ Uploading to Supabase Storage...');
const { data: uploadData, error: uploadError } = await supabase.storage
  .from('driver-documents')
  .upload(fileName, formData, {
    contentType: file.type,
    upsert: false
  });

// Alternative approach using direct file upload
// If FormData doesn't work, try this:
/*
const { data: uploadData, error: uploadError } = await supabase.storage
  .from('driver-documents')
  .upload(fileName, {
    uri: file.uri,
    type: file.type,
    name: fileName,
  }, {
    contentType: file.type,
    upsert: false
  });
*/
