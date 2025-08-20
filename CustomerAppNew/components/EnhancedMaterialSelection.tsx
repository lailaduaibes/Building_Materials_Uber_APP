/**
 * Enhanced Material Selection Component
 * Professional category-based material browsing with search
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Import our established theme and components
import { Card } from '../components';
import { Theme } from '../theme';

interface Material {
  id: string;
  name: string;
  category: string;
  materialType?: string;
  unit: string;
  pricePerUnit: number;
  description: string;
  inStock: boolean;
  weight?: number;
  imageUrl?: string;
  specifications?: string[];
}

interface MaterialSelectionProps {
  visible: boolean;
  materials: Material[];
  onClose: () => void;
  onSelectMaterial: (material: Material) => void;
  selectedMaterials: string[]; // Array of selected material IDs
}

const MATERIAL_CATEGORIES = [
  { id: 'all', name: 'All Materials', icon: 'grid-outline' },
  { id: 'concrete', name: 'Concrete', icon: 'cube-outline' },
  { id: 'lumber', name: 'Lumber', icon: 'leaf-outline' },
  { id: 'steel', name: 'Steel & Metal', icon: 'build-outline' },
  { id: 'masonry', name: 'Masonry', icon: 'business-outline' },
  { id: 'roofing', name: 'Roofing', icon: 'triangle-outline' },
  { id: 'insulation', name: 'Insulation', icon: 'layers-outline' },
  { id: 'electrical', name: 'Electrical', icon: 'flash-outline' },
  { id: 'plumbing', name: 'Plumbing', icon: 'water-outline' },
];

export const EnhancedMaterialSelection: React.FC<MaterialSelectionProps> = ({
  visible,
  materials,
  onClose,
  onSelectMaterial,
  selectedMaterials,
}) => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredMaterials, setFilteredMaterials] = useState<Material[]>(materials);

  useEffect(() => {
    filterMaterials();
  }, [materials, selectedCategory, searchQuery]);

  const filterMaterials = () => {
    let filtered = materials;

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(material => 
        material.category.toLowerCase() === selectedCategory.toLowerCase()
      );
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(material =>
        material.name.toLowerCase().includes(query) ||
        material.description.toLowerCase().includes(query) ||
        material.category.toLowerCase().includes(query)
      );
    }

    // Sort by availability and name
    filtered.sort((a, b) => {
      if (a.inStock && !b.inStock) return -1;
      if (!a.inStock && b.inStock) return 1;
      return a.name.localeCompare(b.name);
    });

    setFilteredMaterials(filtered);
  };

  const formatCurrency = (amount: number): string => {
    return `$${amount.toFixed(2)}`;
  };

  const renderCategoryTab = (category: typeof MATERIAL_CATEGORIES[0]) => (
    <TouchableOpacity
      key={category.id}
      style={[
        styles.categoryTab,
        selectedCategory === category.id && styles.activeCategoryTab,
      ]}
      onPress={() => setSelectedCategory(category.id)}
    >
      <Ionicons
        name={category.icon as any}
        size={20}
        color={selectedCategory === category.id ? Theme.colors.primary : Theme.colors.text.secondary}
      />
      <Text style={[
        styles.categoryTabText,
        selectedCategory === category.id && styles.activeCategoryTabText,
      ]}>
        {category.name}
      </Text>
    </TouchableOpacity>
  );

  const renderMaterialCard = ({ item }: { item: Material }) => {
    const isSelected = selectedMaterials.includes(item.id);
    
    return (
      <Card style={[styles.materialCard, !item.inStock && styles.outOfStockCard]}>
        <TouchableOpacity
          onPress={() => item.inStock && onSelectMaterial(item)}
          style={styles.materialContent}
          disabled={!item.inStock}
        >
          {/* Material Image */}
          <View style={styles.materialImageContainer}>
            {item.imageUrl ? (
              <Image source={{ uri: item.imageUrl }} style={styles.materialImage} />
            ) : (
              <View style={styles.materialImagePlaceholder}>
                <Ionicons 
                  name="cube-outline" 
                  size={32} 
                  color={Theme.colors.text.light} 
                />
              </View>
            )}
            {isSelected && (
              <View style={styles.selectedBadge}>
                <Ionicons name="checkmark" size={16} color={Theme.colors.text.white} />
              </View>
            )}
            {!item.inStock && (
              <View style={styles.outOfStockBadge}>
                <Text style={styles.outOfStockText}>Out of Stock</Text>
              </View>
            )}
          </View>

          {/* Material Info */}
          <View style={styles.materialInfo}>
            <Text style={[
              styles.materialName,
              !item.inStock && styles.outOfStockText,
            ]}>
              {item.name}
            </Text>
            
            <Text style={styles.materialCategory}>{item.category}</Text>
            
            <Text style={styles.materialDescription} numberOfLines={2}>
              {item.description}
            </Text>

            {/* Specifications */}
            {item.specifications && item.specifications.length > 0 && (
              <View style={styles.specifications}>
                {item.specifications.slice(0, 2).map((spec, index) => (
                  <Text key={index} style={styles.specificationText}>
                    • {spec}
                  </Text>
                ))}
              </View>
            )}

            {/* Pricing */}
            <View style={styles.pricingContainer}>
              <Text style={[
                styles.priceText,
                !item.inStock && styles.outOfStockText,
              ]}>
                {formatCurrency(item.pricePerUnit)}
              </Text>
              <Text style={styles.unitText}>per {item.unit}</Text>
            </View>

            {/* Weight info if available */}
            {item.weight && (
              <Text style={styles.weightText}>
                Weight: {item.weight} lbs
              </Text>
            )}
          </View>

          {/* Add Button */}
          {item.inStock && (
            <View style={styles.addButtonContainer}>
              <TouchableOpacity
                style={[
                  styles.addButton,
                  isSelected && styles.selectedAddButton,
                ]}
                onPress={() => onSelectMaterial(item)}
              >
                <Ionicons
                  name={isSelected ? "checkmark" : "add"}
                  size={20}
                  color={isSelected ? Theme.colors.text.white : Theme.colors.primary}
                />
              </TouchableOpacity>
            </View>
          )}
        </TouchableOpacity>
      </Card>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="search-outline" size={64} color={Theme.colors.text.light} />
      <Text style={styles.emptyTitle}>No Materials Found</Text>
      <Text style={styles.emptyMessage}>
        {searchQuery 
          ? `No materials match "${searchQuery}"`
          : `No materials available in ${MATERIAL_CATEGORIES.find(c => c.id === selectedCategory)?.name}`
        }
      </Text>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={Theme.colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Select Materials</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color={Theme.colors.text.secondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search materials..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor={Theme.colors.text.light}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color={Theme.colors.text.secondary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Category Tabs */}
        <View style={styles.categoriesContainer}>
          <FlatList
            data={MATERIAL_CATEGORIES}
            renderItem={({ item }) => renderCategoryTab(item)}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesList}
          />
        </View>

        {/* Materials List */}
        <View style={styles.materialsContainer}>
          <FlatList
            data={filteredMaterials}
            renderItem={renderMaterialCard}
            keyExtractor={(item) => item.id}
            numColumns={2}
            contentContainerStyle={styles.materialsList}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={renderEmptyState}
            columnWrapperStyle={styles.materialRow}
          />
        </View>

        {/* Footer with selected count */}
        {selectedMaterials.length > 0 && (
          <View style={styles.footer}>
            <Text style={styles.selectedCount}>
              {selectedMaterials.length} material{selectedMaterials.length > 1 ? 's' : ''} selected
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.doneButton}>
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background.secondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.md,
    backgroundColor: Theme.colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border.light,
  },
  closeButton: {
    padding: Theme.spacing.xs,
  },
  headerTitle: {
    ...Theme.typography.heading2,
    color: Theme.colors.text.primary,
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  searchContainer: {
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
    backgroundColor: Theme.colors.background.primary,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.background.secondary,
    borderRadius: Theme.borderRadius.md,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
    gap: Theme.spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...Theme.typography.body1,
    color: Theme.colors.text.primary,
  },
  categoriesContainer: {
    backgroundColor: Theme.colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border.light,
  },
  categoriesList: {
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
    gap: Theme.spacing.sm,
  },
  categoryTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
    backgroundColor: Theme.colors.background.secondary,
    borderRadius: Theme.borderRadius.full,
    gap: Theme.spacing.xs,
  },
  activeCategoryTab: {
    backgroundColor: Theme.colors.primary,
  },
  categoryTabText: {
    ...Theme.typography.body2,
    color: Theme.colors.text.secondary,
    fontWeight: '500',
  },
  activeCategoryTabText: {
    color: Theme.colors.text.white,
  },
  materialsContainer: {
    flex: 1,
  },
  materialsList: {
    padding: Theme.spacing.md,
    gap: Theme.spacing.sm,
  },
  materialRow: {
    gap: Theme.spacing.sm,
  },
  materialCard: {
    flex: 1,
    maxWidth: '48%',
  },
  outOfStockCard: {
    opacity: 0.6,
  },
  materialContent: {
    padding: Theme.spacing.sm,
  },
  materialImageContainer: {
    position: 'relative',
    marginBottom: Theme.spacing.sm,
  },
  materialImage: {
    width: '100%',
    height: 100,
    borderRadius: Theme.borderRadius.sm,
    backgroundColor: Theme.colors.background.secondary,
  },
  materialImagePlaceholder: {
    width: '100%',
    height: 100,
    borderRadius: Theme.borderRadius.sm,
    backgroundColor: Theme.colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedBadge: {
    position: 'absolute',
    top: Theme.spacing.xs,
    right: Theme.spacing.xs,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Theme.colors.success,
    justifyContent: 'center',
    alignItems: 'center',
  },
  outOfStockBadge: {
    position: 'absolute',
    bottom: Theme.spacing.xs,
    left: Theme.spacing.xs,
    right: Theme.spacing.xs,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: Theme.borderRadius.sm,
    paddingVertical: Theme.spacing.xs,
    paddingHorizontal: Theme.spacing.sm,
  },
  outOfStockText: {
    ...Theme.typography.caption,
    color: Theme.colors.text.white,
    textAlign: 'center',
    fontWeight: '600',
  },
  materialInfo: {
    flex: 1,
  },
  materialName: {
    ...Theme.typography.body1,
    color: Theme.colors.text.primary,
    fontWeight: '600',
    marginBottom: Theme.spacing.xs,
  },
  materialCategory: {
    ...Theme.typography.caption,
    color: Theme.colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Theme.spacing.xs,
  },
  materialDescription: {
    ...Theme.typography.body2,
    color: Theme.colors.text.secondary,
    marginBottom: Theme.spacing.sm,
  },
  specifications: {
    marginBottom: Theme.spacing.sm,
  },
  specificationText: {
    ...Theme.typography.caption,
    color: Theme.colors.text.light,
  },
  pricingContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Theme.spacing.xs,
    marginBottom: Theme.spacing.xs,
  },
  priceText: {
    ...Theme.typography.heading3,
    color: Theme.colors.primary,
    fontWeight: '700',
  },
  unitText: {
    ...Theme.typography.caption,
    color: Theme.colors.text.secondary,
  },
  weightText: {
    ...Theme.typography.caption,
    color: Theme.colors.text.light,
  },
  addButtonContainer: {
    position: 'absolute',
    bottom: Theme.spacing.sm,
    right: Theme.spacing.sm,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Theme.colors.background.primary,
    borderWidth: 2,
    borderColor: Theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedAddButton: {
    backgroundColor: Theme.colors.primary,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Theme.spacing.xl,
  },
  emptyTitle: {
    ...Theme.typography.heading2,
    color: Theme.colors.text.primary,
    marginTop: Theme.spacing.md,
    marginBottom: Theme.spacing.sm,
  },
  emptyMessage: {
    ...Theme.typography.body1,
    color: Theme.colors.text.secondary,
    textAlign: 'center',
    maxWidth: 280,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.md,
    backgroundColor: Theme.colors.background.primary,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border.light,
  },
  selectedCount: {
    ...Theme.typography.body1,
    color: Theme.colors.text.primary,
    fontWeight: '500',
  },
  doneButton: {
    backgroundColor: Theme.colors.primary,
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.sm,
    borderRadius: Theme.borderRadius.md,
  },
  doneButtonText: {
    ...Theme.typography.body1,
    color: Theme.colors.text.white,
    fontWeight: '600',
  },
});

export default EnhancedMaterialSelection;
