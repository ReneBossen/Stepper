import React, { useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  useWindowDimensions,
  TouchableOpacity,
  ViewToken,
} from 'react-native';
import { Button, Text, useTheme } from 'react-native-paper';
import { OnboardingStackScreenProps } from '@navigation/types';
import OnboardingLayout from './components/OnboardingLayout';
import WelcomeSlide from './components/WelcomeSlide';

type WelcomeCarouselProps = OnboardingStackScreenProps<'WelcomeCarousel'>;

interface SlideData {
  id: string;
  emoji: string;
  title: string;
  description: string;
}

const slides: SlideData[] = [
  {
    id: '1',
    emoji: '🚶‍♂️🚶‍♀️',
    title: 'Track Your Steps',
    description: 'Keep track of your daily walking activity and reach your fitness goals',
  },
  {
    id: '2',
    emoji: '📊',
    title: 'Daily Insights',
    description: 'View your progress with detailed charts and statistics',
  },
  {
    id: '3',
    emoji: '👥',
    title: 'Connect & Compete',
    description: 'Add friends and join groups to compete on leaderboards',
  },
];

export default function WelcomeCarousel({ navigation }: WelcomeCarouselProps) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const flatListRef = useRef<FlatList<SlideData>>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken<SlideData>[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        setCurrentIndex(viewableItems[0].index);
      }
    }
  ).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
    } else {
      navigation.navigate('Permissions');
    }
  };

  const handleSkip = () => {
    navigation.navigate('Permissions');
  };

  const renderDot = (index: number) => (
    <View
      key={index}
      style={[
        styles.dot,
        {
          backgroundColor:
            index === currentIndex ? theme.colors.primary : theme.colors.surfaceVariant,
        },
      ]}
    />
  );

  return (
    <OnboardingLayout>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
            <Text variant="labelLarge" style={{ color: theme.colors.primary }}>
              Skip →
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.carouselContainer}>
          <FlatList
            ref={flatListRef}
            data={slides}
            renderItem={({ item }) => (
              <WelcomeSlide emoji={item.emoji} title={item.title} description={item.description} />
            )}
            keyExtractor={(item) => item.id}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            bounces={false}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            getItemLayout={(_, index) => ({
              length: width,
              offset: width * index,
              index,
            })}
            style={styles.flatList}
          />
        </View>

        <View style={styles.footer}>
          <View style={styles.dotsContainer}>
            {slides.map((_, index) => renderDot(index))}
          </View>

          <Button mode="contained" onPress={handleNext} style={styles.nextButton}>
            {currentIndex === slides.length - 1 ? 'Get Started' : 'Next'}
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
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  skipButton: {
    alignSelf: 'flex-end',
    padding: 8,
  },
  carouselContainer: {
    flex: 1,
  },
  flatList: {
    flex: 1,
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 24,
    alignItems: 'center',
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 24,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  nextButton: {
    minWidth: 200,
  },
});
