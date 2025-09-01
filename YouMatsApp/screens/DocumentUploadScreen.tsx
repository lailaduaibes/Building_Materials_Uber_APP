import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
  Platform,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { driverService } from '../services/DriverService'; // Use DriverService instead of direct Supabase
import { useLanguage } from '../src/contexts/LanguageContext';

const { width } = Dimensions.get('window');

// Professional Blue & White Theme
const theme = {
  primary: '#3B82F6',
  secondary: '#FFFFFF',
  accent: '#1E40AF',
  background: '#F8FAFC',
  white: '#FFFFFF',
  text: '#1F2937',
  lightText: '#6B7280',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  border: '#E5E7EB',
};

interface DocumentUploadScreenProps {
  driverId: string;
  onDocumentsUploaded: () => void;
  onBack: () => void;
}

interface DocumentType {
  id: string;
  title: string;
  description: string;
  required: boolean;
  icon: string;
  accepted: string[];
}

interface UploadedDocument {
  id: string;
  type: string;
  fileName: string;
  fileSize: number;
  uploadedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  url: string;
}

const documentTypes: DocumentType[] = [
  {
    id: 'drivers_license',
    title: "Driver's License",
    description: 'Front and back of your valid driver\'s license',
    required: true,
    icon: 'card-outline',
    accepted: ['image/jpeg', 'image/png', 'application/pdf']
  },
  {
    id: 'vehicle_registration',
    title: 'Vehicle Registration',
    description: 'Current vehicle registration document',
    required: true,
    icon: 'car-outline',
    accepted: ['image/jpeg', 'image/png', 'application/pdf']
  },
  {
    id: 'insurance_certificate',
    title: 'Insurance Certificate',
    description: 'Valid vehicle insurance certificate',
    required: true,
    icon: 'shield-checkmark-outline',
    accepted: ['image/jpeg', 'image/png', 'application/pdf']
  },
  {
    id: 'profile_photo',
    title: 'Profile Photo',
    description: 'Clear photo for your driver profile',
    required: true,
    icon: 'person-outline',
    accepted: ['image/jpeg', 'image/png']
  },
  {
    id: 'vehicle_photo',
    title: 'Vehicle Photo',
    description: 'Photo of your delivery vehicle',
    required: false,
    icon: 'camera-outline',
    accepted: ['image/jpeg', 'image/png']
  }
];

export const DocumentUploadScreen: React.FC<DocumentUploadScreenProps> = ({
  driverId,
  onDocumentsUploaded,
  onBack,
}) => {
  const { t } = useLanguage();
  const [uploadedDocuments, setUploadedDocuments] = useState<UploadedDocument[]>([]);
  const [uploadingDocuments, setUploadingDocuments] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadExistingDocuments();
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    try {
      const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
      const { status: libraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (cameraStatus !== 'granted' || libraryStatus !== 'granted') {
        Alert.alert(
          'Permissions Required',
          'Camera and photo library access are required to upload documents.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error requesting permissions:', error);
    }
  };

  const loadExistingDocuments = async () => {
    try {
      setLoading(true);
      
      // First check if user is authenticated
      const authStatus = await driverService.isAuthenticated();
      if (!authStatus.authenticated) {
        console.log('❌ User not authenticated for document loading:', authStatus.message);
        Alert.alert(
          'Authentication Required', 
          'You need to be logged in to access documents. Please log in again.',
          [{ text: 'OK' }]
        );
        return;
      }
      
      // Use DriverService to get documents
      const documents = await driverService.getDriverDocuments(driverId);
      
      // Convert DriverDocument[] to UploadedDocument[] format
      const convertedDocuments: UploadedDocument[] = documents.map(doc => ({
        id: doc.id,
        type: doc.document_type,
        fileName: doc.file_name,
        fileSize: doc.file_size,
        uploadedAt: doc.uploaded_at,
        status: doc.status,
        url: doc.file_url
      }));
      
      setUploadedDocuments(convertedDocuments);
      
    } catch (error) {
      console.error('Error loading documents:', error);
      Alert.alert('Error', 'Failed to load existing documents');
    } finally {
      setLoading(false);
    }
  };

  const showDocumentOptions = (documentType: DocumentType) => {
    Alert.alert(
      `Upload ${documentType.title}`,
      'Choose how you want to upload this document',
      [
        { text: 'Camera', onPress: () => openCamera(documentType) },
        { text: 'Photo Library', onPress: () => openImagePicker(documentType) },
        { text: 'Files', onPress: () => openDocumentPicker(documentType) },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const openCamera = async (documentType: DocumentType) => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: documentType.id === 'profile_photo' ? [1, 1] : [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadDocument(documentType, result.assets[0]);
      }
    } catch (error) {
      console.error('Error opening camera:', error);
      Alert.alert('Error', 'Failed to open camera');
    }
  };

  const openImagePicker = async (documentType: DocumentType) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: documentType.id === 'profile_photo' ? [1, 1] : [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadDocument(documentType, result.assets[0]);
      }
    } catch (error) {
      console.error('Error opening image picker:', error);
      Alert.alert('Error', 'Failed to open photo library');
    }
  };

  const openDocumentPicker = async (documentType: DocumentType) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: documentType.accepted,
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadDocument(documentType, result.assets[0]);
      }
    } catch (error) {
      console.error('Error opening document picker:', error);
      Alert.alert('Error', 'Failed to open file picker');
    }
  };

  const uploadDocument = async (documentType: DocumentType, file: any) => {
    try {
      setUploadingDocuments(prev => [...prev, documentType.id]);

      // First check authentication
      const authStatus = await driverService.isAuthenticated();
      if (!authStatus.authenticated) {
        Alert.alert(
          'Authentication Required', 
          'You need to be logged in to upload documents. Please log in again.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Use DriverService for upload
      const result = await driverService.uploadDocument(driverId, documentType.id, {
        uri: file.uri,
        name: file.name || `${documentType.id}.jpg`,
        type: file.mimeType || file.type || 'image/jpeg',
        size: file.size
      });

      if (result.success) {
        Alert.alert(
          'Success',
          `${documentType.title} uploaded successfully and is pending review.`
        );
        // Refresh the documents list
        loadExistingDocuments();
      } else {
        Alert.alert('Upload Failed', result.message || 'Failed to upload document. Please try again.');
      }

    } catch (error) {
      console.error('Error uploading document:', error);
      Alert.alert('Upload Failed', 'Failed to upload document. Please try again.');
    } finally {
      setUploadingDocuments(prev => prev.filter(id => id !== documentType.id));
    }
  };

  const deleteDocument = async (documentId: string) => {
    Alert.alert(
      'Delete Document',
      'Are you sure you want to delete this document?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const success = await driverService.deleteDocument(documentId);

              if (success) {
                setUploadedDocuments(prev => 
                  prev.filter(doc => doc.id !== documentId)
                );
                Alert.alert('Success', 'Document deleted successfully');
              } else {
                Alert.alert('Error', 'Failed to delete document');
              }
            } catch (error) {
              console.error('Error deleting document:', error);
              Alert.alert('Error', 'Failed to delete document');
            }
          }
        }
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return theme.success;
      case 'rejected': return theme.error;
      default: return theme.warning;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'approved': return 'Approved';
      case 'rejected': return 'Rejected';
      default: return 'Pending Review';
    }
  };

  const isDocumentUploaded = (documentTypeId: string) => {
    return uploadedDocuments.some(doc => 
      doc.type === documentTypeId && doc.status !== 'rejected'
    );
  };

  const getRequiredDocumentsCount = () => {
    const requiredTypes = documentTypes.filter(type => type.required);
    const uploadedRequired = requiredTypes.filter(type => isDocumentUploaded(type.id));
    return { total: requiredTypes.length, uploaded: uploadedRequired.length };
  };

  const canComplete = () => {
    const { total, uploaded } = getRequiredDocumentsCount();
    return uploaded === total;
  };

  const renderDocumentType = (documentType: DocumentType) => {
    const isUploaded = isDocumentUploaded(documentType.id);
    const isUploading = uploadingDocuments.includes(documentType.id);
    const uploadedDoc = uploadedDocuments.find(doc => 
      doc.type === documentType.id && doc.status !== 'rejected'
    );

    return (
      <View key={documentType.id} style={styles.documentCard}>
        <View style={styles.documentHeader}>
          <View style={styles.documentIcon}>
            <Ionicons 
              name={documentType.icon as any} 
              size={24} 
              color={isUploaded ? theme.success : theme.accent} 
            />
          </View>
          <View style={styles.documentInfo}>
            <Text style={styles.documentTitle}>
              {documentType.title}
              {documentType.required && <Text style={styles.required}> *</Text>}
            </Text>
            <Text style={styles.documentDescription}>
              {documentType.description}
            </Text>
          </View>
        </View>

        {isUploaded && uploadedDoc && (
          <View style={styles.uploadedInfo}>
            <View style={styles.statusBadge}>
              <View 
                style={[
                  styles.statusDot, 
                  { backgroundColor: getStatusColor(uploadedDoc.status) }
                ]} 
              />
              <Text style={[
                styles.statusText,
                { color: getStatusColor(uploadedDoc.status) }
              ]}>
                {getStatusText(uploadedDoc.status)}
              </Text>
            </View>
            <Text style={styles.fileName}>{uploadedDoc.fileName}</Text>
            <Text style={styles.uploadDate}>
              Uploaded {new Date(uploadedDoc.uploadedAt).toLocaleDateString()}
            </Text>
          </View>
        )}

        <View style={styles.documentActions}>
          {isUploading ? (
            <View style={styles.uploadingContainer}>
              <ActivityIndicator size="small" color={theme.primary} />
              <Text style={styles.uploadingText}>{t('common.uploading')}</Text>
            </View>
          ) : (
            <>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  styles.uploadButton,
                  isUploaded && styles.reuploadButton
                ]}
                onPress={() => showDocumentOptions(documentType)}
              >
                <Ionicons 
                  name={isUploaded ? "refresh-outline" : "cloud-upload-outline"} 
                  size={16} 
                  color={isUploaded ? theme.primary : theme.white} 
                />
                <Text style={[
                  styles.uploadButtonText,
                  isUploaded && styles.reuploadButtonText
                ]}>
                  {isUploaded ? 'Replace' : 'Upload'}
                </Text>
              </TouchableOpacity>

              {isUploaded && uploadedDoc && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.deleteButton]}
                  onPress={() => deleteDocument(uploadedDoc.id)}
                >
                  <Ionicons name="trash-outline" size={18} color={theme.error} />
                  <Text style={styles.deleteButtonText}>Delete</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </View>
    );
  };

  const { total, uploaded } = getRequiredDocumentsCount();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Upload Documents</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Progress */}
      <View style={styles.progressContainer}>
        <Text style={styles.progressText}>
          Required Documents: {uploaded}/{total} completed
        </Text>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { width: `${(uploaded / total) * 100}%` }
            ]} 
          />
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={styles.loadingText}>Loading documents...</Text>
        </View>
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionTitle}>Document Verification</Text>
          <Text style={styles.sectionDescription}>
            Upload the required documents to complete your driver verification. 
            All documents will be reviewed by our team.
          </Text>

          {documentTypes.map(renderDocumentType)}
        </ScrollView>
      )}

      {/* Complete Button */}
      {canComplete() && (
        <View style={styles.completeContainer}>
          <TouchableOpacity
            style={styles.completeButton}
            onPress={onDocumentsUploaded}
          >
            <Ionicons name="checkmark-circle-outline" size={20} color={theme.white} />
            <Text style={styles.completeButtonText}>Complete Verification</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    backgroundColor: theme.white,
    shadowColor: theme.primary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.text,
  },
  placeholder: {
    width: 40,
  },
  progressContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: theme.white,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  progressText: {
    fontSize: 14,
    color: theme.text,
    marginBottom: 8,
    fontWeight: '500',
  },
  progressBar: {
    height: 4,
    backgroundColor: theme.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.success,
    borderRadius: 2,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.text,
    marginTop: 20,
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: theme.lightText,
    lineHeight: 20,
    marginBottom: 20,
  },
  documentCard: {
    backgroundColor: theme.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.border,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  documentHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  documentIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EBF4FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  documentInfo: {
    flex: 1,
  },
  documentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.text,
    marginBottom: 4,
  },
  required: {
    color: theme.error,
  },
  documentDescription: {
    fontSize: 14,
    color: theme.lightText,
    lineHeight: 18,
  },
  uploadedInfo: {
    backgroundColor: '#EBF4FF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: theme.primary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  fileName: {
    fontSize: 14,
    color: theme.text,
    fontWeight: '500',
    marginBottom: 4,
  },
  uploadDate: {
    fontSize: 12,
    color: theme.lightText,
  },
  documentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginTop: 4,
  },
  uploadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  uploadingText: {
    fontSize: 14,
    color: theme.lightText,
    marginLeft: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    minHeight: 44,
  },
  uploadButton: {
    backgroundColor: theme.primary,
    flex: 1,
    marginRight: 8,
    justifyContent: 'center',
    borderRadius: 8,
    shadowColor: theme.primary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  reuploadButton: {
    backgroundColor: theme.white,
    borderWidth: 1,
    borderColor: theme.primary,
    borderRadius: 8,
    shadowColor: theme.primary,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  uploadButtonText: {
    color: theme.white,
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  reuploadButtonText: {
    color: theme.primary,
  },
  deleteButton: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: theme.error,
    minWidth: 80,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    shadowColor: theme.error,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  deleteButtonText: {
    color: theme.error,
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: theme.lightText,
    marginTop: 16,
  },
  completeContainer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: theme.border,
    backgroundColor: theme.white,
  },
  completeButton: {
    backgroundColor: theme.success,
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  completeButtonText: {
    color: theme.white,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default DocumentUploadScreen;
