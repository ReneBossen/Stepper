import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, FlatList, Dimensions, TouchableOpacity, ListRenderItem } from 'react-native';
import { Text, Button, Icon } from 'react-native-paper';
import { OnboardingStackScreenProps } from '@navigation/types';
import { ONBOARDING_ROUTES } from '@navigation/routes';
import { useAppTheme } from '@hooks/useAppTheme';
import { track } from '@services/analytics';
import OnboardingLayout from './components/OnboardingLayout';

type Props = OnboardingStackScreenProps<'WelcomeCarousel'>;

interface WelcomeSlide {
  id: string;
  iconSource: string;
  title: string;
  description: string;
}

const SLIDES: WelcomeSlide[] = [
  {
    id: '1',
    iconSource: 'walk',
    title: 'Track Your Steps',
    description: 'Keep track of your daily walking activity and reach your fitness goals',
  },
  {
    id: '2',
    iconSource: 'chart-bar',
    title: 'Daily Insights',
    description: 'View your progress with detailed charts and statistics',
  },
  {
    id: '3',
    iconSource: 'account-group',
    title: 'Connect & Compete',
    description: 'Add friends and join groups to compete on leaderboards',
  },
];

const { width: screenWidth } = Dimensions.get('window');

export default function WelcomeCarouselScreen({ navigation }: Props) {
  const { paperTheme } = useAppTheme();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const trackedSteps = useRef<Set<number>>(new Set());

  // Track the first step on mount
  useEffect(() => {
    track('onboarding_step_completed', { step_number: 1, step_name: 'welcome' });
    trackedSteps.current.add(0);
  }, []);

  const handleSkip = () => {
    // Track onboarding skipped event
    track('onboarding_skipped', {});
    navigation.navigate(ONBOARDING_ROUTES.AnalyticsConsent);
  };

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      const nextIndex = currentIndex + 1;
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
      setCurrentIndex(nextIndex);
    } else {
      navigation.navigate(ONBOARDING_ROUTES.AnalyticsConsent);
    }
  };

  const handleMomentumScrollEnd = (event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / screenWidth);
    setCurrentIndex(index);

    // Track step completion if not already tracked
    if (!trackedSteps.current.has(index)) {
      const stepNames = ['welcome', 'insights', 'social'];
      track('onboarding_step_completed', {
        step_number: index + 1,
        step_name: stepNames[index] || 'unknown',
      });
      trackedSteps.current.add(index);
    }
  };

  const renderSlide: ListRenderItem<WelcomeSlide> = ({ item }) => (
    <View style={[styles.slide, { width: screenWidth - 48 }]}>
      <View style={styles.iconContainer}>
        <Icon source={item.iconSource} size={80} color={paperTheme.colors.primary} />
      </View>
      <Text variant="headlineMedium" style={[styles.title, { color: paperTheme.colors.onBackground }]}>
        {item.title}
      </Text>
      <Text variant="bodyLarge" style={[styles.description, { color: paperTheme.colors.onSurfaceVariant }]}>
        {item.description}
      </Text>
    </View>
  );

  const renderPaginationDots = () => (
    <View style={styles.pagination}>
      {SLIDES.map((_, index) => (
        <View
          key={index}
          style={[
            styles.dot,
            {
              backgroundColor: index === currentIndex
                ? paperTheme.colors.primary
                : paperTheme.colors.surfaceVariant,
            },
          ]}
        />
      ))}
    </View>
  );

  const isLastSlide = currentIndex === SLIDES.length - 1;

  return (
    <OnboardingLayout showScrollView={false}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
            <Text variant="labelLarge" style={{ color: paperTheme.colors.primary }}>
              Skip →
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.carouselContainer}>
          <FlatList
            ref={flatListRef}
            data={SLIDES}
            renderItem={renderSlide}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handleMomentumScrollEnd}
            keyExtractor={(item) => item.id}
            bounces={false}
            scrollEventThrottle={16}
          />
        </View>

        {renderPaginationDots()}

        <View style={styles.footer}>
          <Button
            mode="contained"
            onPress={handleNext}
            style={styles.button}
            contentStyle={styles.buttonContent}
          >
            {isLastSlide ? 'Get Started' : 'Next'}
          </Button>
        </View>
      </View>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'flex-end',
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  skipButton: {
    padding: 8,
  },
  carouselContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  slide: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  iconContainer: {
    marginBottom: 32,
  },
  iconWrapper: {
    alignItems: 'center',
  },
  title: {
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    textAlign: 'center',
    lineHeight: 24,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 24,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  button: {
    marginBottom: 8,
  },
  buttonContent: {
    paddingVertical: 8,
  },
});
