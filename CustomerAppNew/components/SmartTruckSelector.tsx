/**
 * Smart Truck Recommendation Component
 * Shows intelligent truck suggestions based on material type and requirements
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Theme } from '../theme';
import { TruckType } from '../services/TripService';
import { 
  TruckRecommendationEngine, 
  TruckRecommendation, 
  MaterialRequirements 
} from '../services/TruckRecommendationEngine';

interface SmartTruckSelectorProps {
  materialType: string;
  estimatedWeight: number;
  estimatedVolume?: number;
  loadDescription: string;
  requiresCrane?: boolean;
  requiresHydraulicLift?: boolean;
  availableTrucks: TruckType[];
  selectedTruckId?: string;
  onTruckSelect: (truckId: string) => void;
  onShowAllTrucks: () => void;
}

export const SmartTruckSelector: React.FC<SmartTruckSelectorProps> = ({
  materialType,
  estimatedWeight,
  estimatedVolume,
  loadDescription,
  requiresCrane = false,
  requiresHydraulicLift = false,
  availableTrucks,
  selectedTruckId,
  onTruckSelect,
  onShowAllTrucks
}) => {
  const [recommendations, setRecommendations] = useState<TruckRecommendation[]>([]);
  const [showAdvice, setShowAdvice] = useState(false);
  const [showOtherTrucks, setShowOtherTrucks] = useState(false);

  useEffect(() => {
    if (materialType && estimatedWeight > 0 && availableTrucks.length > 0) {
      generateRecommendations();
    }
  }, [materialType, estimatedWeight, estimatedVolume, loadDescription, requiresCrane, requiresHydraulicLift, availableTrucks]);

  const generateRecommendations = () => {
    const requirements: MaterialRequirements = {
      materialType,
      estimatedWeight,
      estimatedVolume,
      loadDescription,
      requiresCrane,
      requiresHydraulicLift
    };

    const recs = TruckRecommendationEngine.recommendTrucks(requirements, availableTrucks);
    setRecommendations(recs);
  };

  const getScoreColor = (score: number): string => {
    if (score >= 80) return Theme.colors.primary; // Blue for excellent
    if (score >= 60) return '#666666'; // Gray for good
    return '#999999'; // Light gray for fair/poor
  };

  const getScoreLabel = (score: number): string => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Poor';
  };

  // Get other available trucks not in top 3 recommendations
  const getOtherTrucks = () => {
    const topRecommendedIds = new Set(recommendations.slice(0, 3).map(rec => rec.truckType.id));
    return availableTrucks.filter(truck => !topRecommendedIds.has(truck.id));
  };

  const topRecommendations = recommendations.slice(0, 3);
  const materialAdvice = TruckRecommendationEngine.getMaterialAdvice(materialType);

  if (recommendations.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>🚛 Smart Truck Recommendations</Text>
        <Text style={styles.subtitle}>
          Enter material type and weight to get recommendations
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.modernHeader}>
        <View style={styles.headerContent}>
          <View style={styles.aiIndicator}>
            <MaterialIcons name="auto-awesome" size={20} color={Theme.colors.primary} />
            <Text style={styles.aiText}>AI Recommendations</Text>
          </View>
          <TouchableOpacity 
            style={styles.tipsButton}
            onPress={() => setShowAdvice(!showAdvice)}
          >
            <MaterialIcons name="lightbulb" size={18} color={Theme.colors.primary} />
            <Text style={styles.tipsText}>Tips</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Material-specific advice */}
      {showAdvice && (
        <View style={styles.modernAdviceContainer}>
          <View style={styles.adviceHeader}>
            <MaterialIcons name="tips-and-updates" size={20} color={Theme.colors.primary} />
            <Text style={styles.adviceHeaderText}>Tips for {materialType}</Text>
          </View>
          <View style={styles.adviceContent}>
            {materialAdvice.map((tip, index) => (
              <View key={index} style={styles.tipRow}>
                <View style={styles.tipBullet} />
                <Text style={styles.modernAdviceTip}>{tip}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Load Summary */}
      <View style={styles.loadSummary}>
        <Text style={styles.loadSummaryTitle}>Your Load</Text>
        <View style={styles.loadDetails}>
          <View style={styles.loadDetailItem}>
            <Text style={styles.loadDetailValue}>{estimatedWeight}t</Text>
            <Text style={styles.loadDetailLabel}>Weight</Text>
          </View>
          {estimatedVolume && (
            <View style={styles.loadDetailItem}>
              <Text style={styles.loadDetailValue}>{estimatedVolume}m³</Text>
              <Text style={styles.loadDetailLabel}>Volume</Text>
            </View>
          )}
          <View style={styles.loadDetailItem}>
            <Text style={styles.loadDetailValue}>{materialType}</Text>
            <Text style={styles.loadDetailLabel}>Material</Text>
          </View>
        </View>
      </View>

      <View style={styles.recommendationsContainer}>
        {topRecommendations.map((rec, index) => (
          <TouchableOpacity
            key={rec.truckType.id}
            style={[
              styles.modernRecommendationCard,
              {
                borderColor: selectedTruckId === rec.truckType.id 
                  ? Theme.colors.primary 
                  : Theme.colors.border.light,
                backgroundColor: selectedTruckId === rec.truckType.id 
                  ? Theme.colors.background.section
                  : Theme.colors.background.card,
                borderWidth: selectedTruckId === rec.truckType.id ? 2 : 1,
              }
            ]}
            onPress={() => onTruckSelect(rec.truckType.id)}
          >
            {/* Best Match Badge */}
            {index === 0 && rec.isRecommended && (
              <View style={styles.bestMatchBadge}>
                <MaterialIcons name="auto-awesome" size={16} color="white" />
                <Text style={styles.bestMatchText}>BEST MATCH</Text>
              </View>
            )}

            {/* Card Header */}
            <View style={styles.modernCardHeader}>
              <View style={styles.truckIconWrapper}>
                <MaterialIcons name="local-shipping" size={28} color={Theme.colors.primary} />
              </View>
              <View style={styles.truckNameSection}>
                <Text style={styles.modernTruckName}>{rec.truckType.name}</Text>
                <Text style={styles.modernTruckCapacity}>
                  {rec.truckType.payload_capacity}t • {rec.truckType.volume_capacity}m³
                </Text>
              </View>
              <View style={styles.modernScoreContainer}>
                <View style={[styles.modernScoreBadge, { backgroundColor: getScoreColor(rec.score) }]}>
                  <Text style={styles.modernScoreText}>{rec.score}</Text>
                </View>
                <Text style={[styles.modernScoreLabel, { color: getScoreColor(rec.score) }]}>
                  {getScoreLabel(rec.score)}
                </Text>
              </View>
            </View>

            {/* Utilization Bars */}
            <View style={styles.modernUtilizationContainer}>
              <View style={styles.modernUtilizationItem}>
                <View style={styles.utilizationHeader}>
                  <Text style={styles.modernUtilizationLabel}>Weight Usage</Text>
                  <Text style={styles.modernUtilizationValue}>
                    {rec.capacityUtilization.weight.toFixed(0)}%
                  </Text>
                </View>
                <View style={styles.modernProgressBar}>
                  <View 
                    style={[
                      styles.modernProgressFill, 
                      { 
                        width: `${Math.min(100, rec.capacityUtilization.weight)}%`,
                        backgroundColor: rec.capacityUtilization.weight > 90 
                          ? Theme.colors.warning
                          : rec.capacityUtilization.weight > 70 
                          ? Theme.colors.secondary
                          : Theme.colors.success
                      }
                    ]} 
                  />
                </View>
              </View>
              
              <View style={styles.modernUtilizationItem}>
                <View style={styles.utilizationHeader}>
                  <Text style={styles.modernUtilizationLabel}>Volume Usage</Text>
                  <Text style={styles.modernUtilizationValue}>
                    {rec.capacityUtilization.volume.toFixed(0)}%
                  </Text>
                </View>
                <View style={styles.modernProgressBar}>
                  <View 
                    style={[
                      styles.modernProgressFill, 
                      { 
                        width: `${Math.min(100, rec.capacityUtilization.volume)}%`,
                        backgroundColor: rec.capacityUtilization.volume > 90 
                          ? Theme.colors.warning
                          : rec.capacityUtilization.volume > 70 
                          ? Theme.colors.secondary
                          : Theme.colors.success
                      }
                    ]} 
                  />
                </View>
              </View>
            </View>

            {/* Key Reasons */}
            <View style={styles.modernReasonsContainer}>
              {rec.reasons.slice(0, 2).map((reason, idx) => (
                <View key={idx} style={styles.reasonRow}>
                  <MaterialIcons name="check-circle" size={14} color={Theme.colors.success} />
                  <Text style={styles.modernReason}>{reason}</Text>
                </View>
              ))}
              {rec.warnings && rec.warnings.length > 0 && (
                <View style={styles.warningRow}>
                  <MaterialIcons name="warning" size={14} color={Theme.colors.warning} />
                  <Text style={styles.modernWarning}>{rec.warnings[0]}</Text>
                </View>
              )}
            </View>

            {/* Selection Status */}
            {selectedTruckId === rec.truckType.id && (
              <View style={styles.modernSelectedIndicator}>
                <MaterialIcons name="check-circle" size={18} color={Theme.colors.success} />
                <Text style={styles.modernSelectedText}>Selected</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Show All Trucks Button */}
      <TouchableOpacity style={styles.showAllButton} onPress={onShowAllTrucks}>
        <MaterialIcons name="list" size={20} color={Theme.colors.primary} />
        <Text style={styles.showAllText}>
          View All {availableTrucks.length} Available Trucks
        </Text>
        <MaterialIcons name="arrow-forward" size={16} color={Theme.colors.primary} />
      </TouchableOpacity>

      {/* Quick Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{topRecommendations.filter(r => r.isRecommended).length}</Text>
          <Text style={styles.statLabel}>Recommended</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{availableTrucks.length}</Text>
          <Text style={styles.statLabel}>Available</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            {TruckRecommendationEngine.estimateVolume(materialType, estimatedWeight).toFixed(1)}m³
          </Text>
          <Text style={styles.statLabel}>Est. Volume</Text>
        </View>
      </View>

      {/* Other Available Trucks Section */}
      {getOtherTrucks().length > 0 && (
        <View style={styles.otherTrucksSection}>
          <TouchableOpacity 
            style={styles.sectionHeader}
            onPress={() => setShowOtherTrucks(!showOtherTrucks)}
          >
            <View style={styles.sectionTitleContainer}>
              <MaterialIcons name="local-shipping" size={20} color={Theme.colors.text.primary} />
              <Text style={styles.otherSectionTitle}>
                Other Available Trucks ({getOtherTrucks().length})
              </Text>
            </View>
            <MaterialIcons 
              name={showOtherTrucks ? 'expand-less' : 'expand-more'} 
              size={24} 
              color={Theme.colors.text.primary} 
            />
          </TouchableOpacity>

          {showOtherTrucks && (
            <View style={styles.otherTrucksList}>
              {getOtherTrucks().map((truck) => (
                <TouchableOpacity
                  key={truck.id}
                  style={[
                    styles.otherTruckCard,
                    selectedTruckId === truck.id && styles.selectedTruckCard
                  ]}
                  onPress={() => onTruckSelect(truck.id)}
                >
                  <View style={styles.truckInfo}>
                    <Text style={styles.truckName}>{truck.name}</Text>
                    <Text style={styles.truckDescription}>{truck.description}</Text>
                    <View style={styles.truckSpecs}>
                      <Text style={styles.specText}>
                        💪 {truck.payload_capacity}kg
                      </Text>
                      <Text style={styles.specText}>
                        📦 {truck.volume_capacity}m³
                      </Text>
                    </View>
                  </View>
                  {selectedTruckId === truck.id && (
                    <MaterialIcons name="check-circle" size={24} color={Theme.colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
              
              <View style={styles.infoNote}>
                <MaterialIcons name="info" size={16} color={Theme.colors.text.secondary} />
                <Text style={styles.infoNoteText}>
                  These trucks are available but may not be optimal for your specific material and weight requirements.
                </Text>
              </View>
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Theme.colors.text.primary,
    marginLeft: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Theme.colors.text.secondary,
    textAlign: 'center',
    marginTop: 20,
  },
  adviceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Theme.colors.primary + '10',
  },
  adviceButtonText: {
    fontSize: 14,
    color: Theme.colors.primary,
    marginLeft: 4,
    fontWeight: '600',
  },
  adviceContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  adviceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E65100',
    marginBottom: 8,
  },
  adviceTip: {
    fontSize: 14,
    color: '#BF360C',
    marginBottom: 4,
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Theme.colors.text.primary,
    marginBottom: 12,
  },
  recommendationCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    borderWidth: 2,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  truckInfo: {
    flex: 1,
  },
  truckName: {
    fontSize: 18,
    fontWeight: '700',
    color: Theme.colors.text.primary,
    marginBottom: 4,
  },
  truckCapacity: {
    fontSize: 14,
    color: Theme.colors.text.secondary,
  },
  scoreContainer: {
    alignItems: 'center',
    marginLeft: 12,
  },
  scoreBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  scoreText: {
    fontSize: 14,
    fontWeight: '700',
    color: 'white',
  },
  scoreLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  bestChoiceBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: Theme.colors.primary,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  bestChoiceText: {
    fontSize: 12,
    color: 'white',
    fontWeight: '600',
    marginLeft: 2,
  },
  utilizationContainer: {
    marginBottom: 12,
  },
  utilizationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  utilizationLabel: {
    fontSize: 12,
    color: Theme.colors.text.secondary,
    width: 50,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#F8F9FA',
    borderRadius: 3,
    marginHorizontal: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  utilizationValue: {
    fontSize: 12,
    color: Theme.colors.text.secondary,
    width: 35,
    textAlign: 'right',
  },
  reasonsContainer: {
    marginBottom: 8,
  },
  reason: {
    fontSize: 12,
    color: Theme.colors.text.secondary,
    marginBottom: 2,
  },
  warning: {
    fontSize: 12,
    color: '#F44336',
    marginBottom: 2,
  },
  selectedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  selectedText: {
    fontSize: 14,
    fontWeight: '600',
    color: Theme.colors.primary,
    marginLeft: 4,
  },
  showAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: Theme.colors.background.primary,
    borderWidth: 2,
    borderColor: Theme.colors.primary,
    borderRadius: 12,
    marginVertical: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  showAllText: {
    fontSize: 16,
    fontWeight: '600',
    color: Theme.colors.primary,
    marginHorizontal: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: Theme.colors.primary,
  },
  statLabel: {
    fontSize: 12,
    color: Theme.colors.text.secondary,
    marginTop: 2,
  },
  // Other trucks section styles
  otherTrucksSection: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border.light,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  otherSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Theme.colors.text.primary,
    marginLeft: 8,
  },
  otherTrucksList: {
    marginTop: 8,
  },
  otherTruckCard: {
    backgroundColor: Theme.colors.background.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Theme.colors.border.light,
  },
  selectedTruckCard: {
    borderColor: Theme.colors.primary,
    backgroundColor: `${Theme.colors.primary}10`,
  },
  truckDescription: {
    fontSize: 14,
    color: Theme.colors.text.secondary,
    marginTop: 4,
  },
  truckSpecs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  specText: {
    fontSize: 12,
    color: Theme.colors.text.secondary,
    marginRight: 12,
    marginBottom: 2,
  },
  infoNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  infoNoteText: {
    fontSize: 12,
    color: Theme.colors.text.secondary,
    marginLeft: 8,
    flex: 1,
    lineHeight: 16,
  },
  // Modern styles
  modernHeader: {
    backgroundColor: Theme.colors.background.section,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  aiIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  aiText: {
    fontSize: 18,
    fontWeight: '600',
    color: Theme.colors.text.primary,
    marginLeft: 8,
  },
  tipsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.background.card,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Theme.colors.border.light,
  },
  tipsText: {
    fontSize: 14,
    color: Theme.colors.primary,
    marginLeft: 4,
    fontWeight: '500',
  },
  modernAdviceContainer: {
    backgroundColor: Theme.colors.background.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: Theme.colors.primary,
  },
  adviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  adviceHeaderText: {
    fontSize: 16,
    fontWeight: '600',
    color: Theme.colors.text.primary,
    marginLeft: 8,
  },
  adviceContent: {
    paddingLeft: 8,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  tipBullet: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Theme.colors.primary,
    marginTop: 8,
    marginRight: 12,
  },
  modernAdviceTip: {
    fontSize: 14,
    color: Theme.colors.text.secondary,
    lineHeight: 20,
    flex: 1,
  },
  loadSummary: {
    backgroundColor: Theme.colors.background.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  loadSummaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Theme.colors.text.primary,
    marginBottom: 12,
  },
  loadDetails: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  loadDetailItem: {
    alignItems: 'center',
  },
  loadDetailValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Theme.colors.primary,
  },
  loadDetailLabel: {
    fontSize: 12,
    color: Theme.colors.text.secondary,
    marginTop: 4,
  },
  // Modern recommendation card styles
  recommendationsContainer: {
    marginBottom: 16,
  },
  modernRecommendationCard: {
    backgroundColor: Theme.colors.background.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
  },
  bestMatchBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: Theme.colors.success,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1,
  },
  bestMatchText: {
    fontSize: 10,
    color: 'white',
    fontWeight: '700',
    marginLeft: 2,
  },
  modernCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  truckIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Theme.colors.background.section,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  truckNameSection: {
    flex: 1,
  },
  modernTruckName: {
    fontSize: 18,
    fontWeight: '600',
    color: Theme.colors.text.primary,
  },
  modernTruckCapacity: {
    fontSize: 14,
    color: Theme.colors.text.secondary,
    marginTop: 2,
  },
  modernScoreContainer: {
    alignItems: 'center',
  },
  modernScoreBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  modernScoreText: {
    fontSize: 12,
    fontWeight: '700',
    color: 'white',
  },
  modernScoreLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  modernUtilizationContainer: {
    marginBottom: 16,
  },
  modernUtilizationItem: {
    marginBottom: 12,
  },
  utilizationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  modernUtilizationLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Theme.colors.text.primary,
  },
  modernUtilizationValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Theme.colors.text.secondary,
  },
  modernProgressBar: {
    height: 8,
    backgroundColor: Theme.colors.background.section,
    borderRadius: 4,
    overflow: 'hidden',
  },
  modernProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
  modernReasonsContainer: {
    marginBottom: 8,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  modernReason: {
    fontSize: 14,
    color: Theme.colors.text.secondary,
    marginLeft: 8,
    flex: 1,
    lineHeight: 18,
  },
  warningRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  modernWarning: {
    fontSize: 14,
    color: Theme.colors.warning,
    marginLeft: 8,
    flex: 1,
    lineHeight: 18,
  },
  modernSelectedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border.light,
  },
  modernSelectedText: {
    fontSize: 14,
    fontWeight: '600',
    color: Theme.colors.success,
    marginLeft: 6,
  },
});

export default SmartTruckSelector;
