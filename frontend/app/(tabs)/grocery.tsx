import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../context/ThemeContext';
import { useFontSize } from '../../context/FontSizeContext';

interface GroceryItem {
  id: string;
  name: string;
  quantity: string;
  category: string;
  checked: boolean;
}

const CATEGORIES = [
  { name: 'Produce', icon: 'leaf', color: '#7EC8B8' },
  { name: 'Dairy', icon: 'water', color: '#5B8FB9' },
  { name: 'Meat', icon: 'restaurant', color: '#E8A87C' },
  { name: 'Bakery', icon: 'cafe', color: '#C7A17A' },
  { name: 'Frozen', icon: 'snow', color: '#9DB4C0' },
  { name: 'Pantry', icon: 'home', color: '#B8A9C9' },
  { name: 'Other', icon: 'ellipsis-horizontal', color: '#95A5A6' },
];

export default function Grocery() {
  const { theme, isDark } = useTheme();
  const { fontSize } = useFontSize();
  const [items, setItems] = useState<GroceryItem[]>([]);
  const [newItem, setNewItem] = useState('');
  const [newQuantity, setNewQuantity] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Produce');
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    try {
      const stored = await AsyncStorage.getItem('grocery_items');
      if (stored) setItems(JSON.parse(stored));
    } catch (e) {
      console.error('Error loading grocery items:', e);
    }
  };

  const saveItems = async (newItems: GroceryItem[]) => {
    try {
      await AsyncStorage.setItem('grocery_items', JSON.stringify(newItems));
      setItems(newItems);
    } catch (e) {
      console.error('Error saving grocery items:', e);
    }
  };

  const addItem = () => {
    if (!newItem.trim()) return;
    const item: GroceryItem = {
      id: Date.now().toString(),
      name: newItem,
      quantity: newQuantity || '1',
      category: selectedCategory,
      checked: false,
    };
    saveItems([...items, item]);
    setNewItem('');
    setNewQuantity('');
    setShowAddForm(false);
  };

  const toggleItem = (id: string) => {
    const updated = items.map(i =>
      i.id === id ? { ...i, checked: !i.checked } : i
    );
    saveItems(updated);
  };

  const deleteItem = (id: string) => {
    saveItems(items.filter(i => i.id !== id));
  };

  const clearChecked = () => {
    saveItems(items.filter(i => !i.checked));
  };

  const getItemsByCategory = (category: string) => {
    return items.filter(i => i.category === category);
  };

  const uncheckedCount = items.filter(i => !i.checked).length;
  const checkedCount = items.filter(i => i.checked).length;

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      padding: 20,
      paddingTop: Platform.OS === 'android' ? 40 : 20,
    },
    title: {
      fontSize: fontSize.title,
      fontWeight: 'bold',
      color: theme.text,
      marginBottom: 16,
    },
    stats: {
      flexDirection: 'row',
      backgroundColor: theme.card,
      borderRadius: 16,
      padding: 16,
    },
    statItem: {
      flex: 1,
      alignItems: 'center',
    },
    statDivider: {
      width: 1,
      backgroundColor: theme.border,
    },
    statNumber: {
      fontSize: fontSize.title,
      fontWeight: 'bold',
      color: theme.primary,
    },
    statLabel: {
      fontSize: fontSize.label,
      color: theme.textLight,
      marginTop: 4,
    },
    addForm: {
      backgroundColor: theme.card,
      margin: 16,
      borderRadius: 16,
      padding: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
    input: {
      backgroundColor: theme.background,
      borderRadius: 12,
      padding: 16,
      fontSize: 18,
      color: theme.text,
      marginBottom: 12,
    },
    quantityInput: {
      width: 100,
    },
    categoryScroll: {
      marginBottom: 12,
    },
    categoryChip: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.background,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 20,
      marginRight: 8,
    },
    categoryChipText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.text,
      marginLeft: 6,
    },
    formButtons: {
      flexDirection: 'row',
    },
    formBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      borderRadius: 12,
    },
    cancelFormBtn: {
      backgroundColor: theme.border,
      marginRight: 8,
    },
    addFormBtn: {
      backgroundColor: theme.primary,
      marginLeft: 8,
    },
    cancelFormText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.textLight,
    },
    addFormText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#FFF',
      marginLeft: 6,
    },
    listContainer: {
      flex: 1,
      paddingHorizontal: 16,
    },
    categorySection: {
      marginBottom: 20,
    },
    categoryHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    categoryTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.text,
      marginLeft: 10,
      flex: 1,
    },
    categoryCount: {
      fontSize: fontSize.small,
      color: theme.textLight,
      backgroundColor: theme.background,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 10,
    },
    itemCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.card,
      padding: 14,
      borderRadius: 14,
      marginBottom: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
    itemChecked: {
      opacity: 0.6,
    },
    checkbox: {
      marginRight: 12,
    },
    itemContent: {
      flex: 1,
    },
    itemName: {
      fontSize: fontSize.body,
      fontWeight: '500',
      color: theme.text,
    },
    itemNameChecked: {
      textDecorationLine: 'line-through',
      color: theme.textLight,
    },
    itemQuantity: {
      fontSize: fontSize.label,
      color: theme.textLight,
      marginTop: 2,
    },
    deleteBtn: {
      padding: 6,
    },
    emptyState: {
      alignItems: 'center',
      paddingTop: 60,
    },
    emptyText: {
      fontSize: 20,
      fontWeight: '600',
      color: theme.text,
      marginTop: 16,
    },
    emptySubtext: {
      fontSize: 16,
      color: theme.textLight,
      marginTop: 8,
    },
    clearBtn: {
      position: 'absolute',
      left: 20,
      bottom: 24,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.warning,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 25,
      shadowColor: theme.warning,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 6,
    },
    clearBtnText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#FFF',
      marginLeft: 8,
    },
    fab: {
      position: 'absolute',
      right: 20,
      bottom: 24,
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: theme.primary,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: theme.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Grocery List</Text>
        <View style={styles.stats}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{uncheckedCount}</Text>
            <Text style={styles.statLabel}>To Buy</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: theme.success }]}>{checkedCount}</Text>
            <Text style={styles.statLabel}>Done</Text>
          </View>
        </View>
      </View>

      {showAddForm && (
        <View style={styles.addForm}>
          <TextInput
            style={styles.input}
            placeholder="Item name"
            placeholderTextColor={theme.textLight}
            value={newItem}
            onChangeText={setNewItem}
            autoFocus
          />
          <TextInput
            style={[styles.input, styles.quantityInput]}
            placeholder="Qty"
            placeholderTextColor={theme.textLight}
            value={newQuantity}
            onChangeText={setNewQuantity}
            keyboardType="default"
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
            {CATEGORIES.map(cat => (
              <TouchableOpacity
                key={cat.name}
                style={[
                  styles.categoryChip,
                  selectedCategory === cat.name && { backgroundColor: isDark ? theme.primary : cat.color },
                ]}
                onPress={() => setSelectedCategory(cat.name)}
              >
                <Ionicons
                  name={cat.icon as any}
                  size={18}
                  color={selectedCategory === cat.name ? '#FFF' : (isDark ? theme.text : cat.color)}
                />
                <Text style={[
                  styles.categoryChipText,
                  selectedCategory === cat.name && { color: '#FFF' },
                ]}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <View style={styles.formButtons}>
            <TouchableOpacity
              style={[styles.formBtn, styles.cancelFormBtn]}
              onPress={() => setShowAddForm(false)}
            >
              <Text style={styles.cancelFormText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.formBtn, styles.addFormBtn]}
              onPress={addItem}
            >
              <Ionicons name="add" size={24} color="#FFF" />
              <Text style={styles.addFormText}>Add Item</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <ScrollView style={styles.listContainer}>
        {CATEGORIES.map(cat => {
          const categoryItems = getItemsByCategory(cat.name);
          if (categoryItems.length === 0) return null;
          return (
            <View key={cat.name} style={styles.categorySection}>
              <View style={styles.categoryHeader}>
                <Ionicons name={cat.icon as any} size={24} color={isDark ? theme.primary : cat.color} />
                <Text style={styles.categoryTitle}>{cat.name}</Text>
                <Text style={styles.categoryCount}>{categoryItems.length}</Text>
              </View>
              {categoryItems.map(item => (
                <View key={item.id} style={[styles.itemCard, item.checked && styles.itemChecked]}>
                  <TouchableOpacity
                    style={styles.checkbox}
                    onPress={() => toggleItem(item.id)}
                  >
                    <Ionicons
                      name={item.checked ? 'checkmark-circle' : 'ellipse-outline'}
                      size={32}
                      color={item.checked ? theme.success : theme.primary}
                    />
                  </TouchableOpacity>
                  <View style={styles.itemContent}>
                    <Text style={[styles.itemName, item.checked && styles.itemNameChecked]}>
                      {item.name}
                    </Text>
                    <Text style={styles.itemQuantity}>Qty: {item.quantity}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => deleteItem(item.id)}
                  >
                    <Ionicons name="close-circle" size={28} color={theme.warning} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          );
        })}
        {items.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="cart-outline" size={80} color={theme.border} />
            <Text style={styles.emptyText}>Your grocery list is empty</Text>
            <Text style={styles.emptySubtext}>Tap the button below to add items</Text>
          </View>
        )}
        <View style={{ height: 150 }} />
      </ScrollView>

      {checkedCount > 0 && (
        <TouchableOpacity style={styles.clearBtn} onPress={clearChecked}>
          <Ionicons name="trash-outline" size={20} color="#FFF" />
          <Text style={styles.clearBtnText}>Clear {checkedCount} checked</Text>
        </TouchableOpacity>
      )}

      {!showAddForm && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setShowAddForm(true)}
        >
          <Ionicons name="add" size={36} color="#FFF" />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}
