import { useRef } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Swiper from 'react-native-deck-swiper';
import type { Dog } from '../types/models';
import { SwipeCard } from './SwipeCard';

interface Props {
  dogs: Dog[];
  onSwipe: (dog: Dog, direction: 'like' | 'pass') => void;
  onEmpty: () => void;
}

export function SwipeDeck({ dogs, onSwipe, onEmpty }: Props) {
  const swiperRef = useRef<Swiper<Dog>>(null);

  if (dogs.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No more dogs nearby right now. Check back later!</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Swiper
        ref={swiperRef}
        cards={dogs}
        renderCard={(dog: Dog) => <SwipeCard dog={dog} />}
        onSwipedLeft={(index: number) => onSwipe(dogs[index], 'pass')}
        onSwipedRight={(index: number) => onSwipe(dogs[index], 'like')}
        onSwipedAll={onEmpty}
        keyExtractor={(dog: Dog) => dog._id}
        backgroundColor="transparent"
        stackSize={3}
        cardVerticalMargin={24}
        overlayLabels={{
          left: { title: 'PASS', style: overlayStyle('#c0392b') },
          right: { title: 'LIKE', style: overlayStyle('#27ae60') },
        }}
      />
      <View style={styles.buttonRow}>
        <Pressable style={[styles.actionButton, styles.passButton]} onPress={() => swiperRef.current?.swipeLeft()}>
          <Text style={styles.actionText}>Pass</Text>
        </Pressable>
        <Pressable style={[styles.actionButton, styles.likeButton]} onPress={() => swiperRef.current?.swipeRight()}>
          <Text style={styles.actionText}>Like</Text>
        </Pressable>
      </View>
    </View>
  );
}

function overlayStyle(color: string) {
  return {
    label: {
      textAlign: 'center' as const,
      color: '#fff',
      fontSize: 24,
      fontWeight: '700' as const,
      backgroundColor: color,
      padding: 8,
      borderRadius: 8,
    },
  };
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  buttonRow: { flexDirection: 'row', justifyContent: 'center', gap: 24, paddingBottom: 24 },
  actionButton: { paddingHorizontal: 32, paddingVertical: 14, borderRadius: 30 },
  passButton: { backgroundColor: '#f1f1f1' },
  likeButton: { backgroundColor: '#fe3c72' },
  actionText: { fontWeight: '700', fontSize: 16 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyText: { fontSize: 16, color: '#666', textAlign: 'center' },
});
