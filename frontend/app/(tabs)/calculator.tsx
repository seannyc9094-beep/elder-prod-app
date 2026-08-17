import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

export default function Calculator() {
  const { theme } = useTheme();
  const [display, setDisplay] = useState('0');
  const [previousValue, setPreviousValue] = useState<string | null>(null);
  const [operator, setOperator] = useState<string | null>(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);
  const [history, setHistory] = useState<string>('');

  const inputDigit = (digit: string) => {
    if (waitingForOperand) {
      setDisplay(digit);
      setWaitingForOperand(false);
    } else {
      setDisplay(display === '0' ? digit : display + digit);
    }
  };

  const inputDecimal = () => {
    if (waitingForOperand) {
      setDisplay('0.');
      setWaitingForOperand(false);
      return;
    }
    if (!display.includes('.')) {
      setDisplay(display + '.');
    }
  };

  const clear = () => {
    setDisplay('0');
    setPreviousValue(null);
    setOperator(null);
    setWaitingForOperand(false);
    setHistory('');
  };

  const toggleSign = () => {
    const value = parseFloat(display);
    setDisplay(String(value * -1));
  };

  const inputPercent = () => {
    const value = parseFloat(display);
    setDisplay(String(value / 100));
  };

  const performOperation = (nextOperator: string) => {
    const inputValue = parseFloat(display);

    if (previousValue === null) {
      setPreviousValue(display);
      setHistory(`${display} ${nextOperator}`);
    } else if (operator) {
      const currentValue = parseFloat(previousValue);
      let result = 0;

      switch (operator) {
        case '+':
          result = currentValue + inputValue;
          break;
        case '-':
          result = currentValue - inputValue;
          break;
        case '×':
          result = currentValue * inputValue;
          break;
        case '÷':
          result = inputValue !== 0 ? currentValue / inputValue : 0;
          break;
      }

      const resultString = String(parseFloat(result.toFixed(10)));
      setDisplay(resultString);
      setPreviousValue(resultString);
      setHistory(`${resultString} ${nextOperator}`);
    }

    setWaitingForOperand(true);
    setOperator(nextOperator);
  };

  const calculate = () => {
    if (!operator || previousValue === null) return;

    const inputValue = parseFloat(display);
    const currentValue = parseFloat(previousValue);
    let result = 0;

    switch (operator) {
      case '+':
        result = currentValue + inputValue;
        break;
      case '-':
        result = currentValue - inputValue;
        break;
      case '×':
        result = currentValue * inputValue;
        break;
      case '÷':
        result = inputValue !== 0 ? currentValue / inputValue : 0;
        break;
    }

    const resultString = String(parseFloat(result.toFixed(10)));
    setHistory(`${previousValue} ${operator} ${display} =`);
    setDisplay(resultString);
    setPreviousValue(null);
    setOperator(null);
    setWaitingForOperand(true);
  };

  const backspace = () => {
    if (display.length > 1) {
      setDisplay(display.slice(0, -1));
    } else {
      setDisplay('0');
    }
  };

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
      fontSize: 32,
      fontWeight: 'bold',
      color: theme.text,
    },
    displayContainer: {
      flex: 1,
      justifyContent: 'flex-end',
      padding: 24,
      backgroundColor: theme.card,
      margin: 16,
      borderRadius: 24,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    history: {
      fontSize: 20,
      color: theme.textLight,
      textAlign: 'right',
      marginBottom: 8,
    },
    display: {
      fontSize: 56,
      fontWeight: '300',
      color: theme.text,
      textAlign: 'right',
    },
    buttonContainer: {
      padding: 16,
      paddingBottom: Platform.OS === 'ios' ? 20 : 16,
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    button: {
      width: 76,
      height: 76,
      borderRadius: 38,
      backgroundColor: theme.card,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 4,
      elevation: 3,
    },
    buttonText: {
      fontSize: 32,
      fontWeight: '500',
      color: theme.text,
    },
    functionButton: {
      backgroundColor: theme.border,
    },
    clearButton: {
      backgroundColor: theme.clear + '20',
    },
    clearText: {
      color: theme.clear,
    },
    operatorButton: {
      backgroundColor: theme.operator,
    },
    operatorText: {
      color: '#FFF',
      fontSize: 36,
    },
    equalsButton: {
      backgroundColor: theme.equals,
    },
    equalsText: {
      color: '#FFF',
      fontSize: 36,
    },
  });

  const renderButton = (
    label: string,
    onPress: () => void,
    buttonStyle?: object,
    textStyle?: object
  ) => (
    <TouchableOpacity
      style={[styles.button, buttonStyle]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {label === 'backspace' ? (
        <Ionicons name="backspace-outline" size={32} color={theme.text} />
      ) : (
        <Text style={[styles.buttonText, textStyle]}>{label}</Text>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Calculator</Text>
      </View>

      <View style={styles.displayContainer}>
        {history ? <Text style={styles.history}>{history}</Text> : null}
        <Text
          style={styles.display}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {display}
        </Text>
      </View>

      <View style={styles.buttonContainer}>
        <View style={styles.row}>
          {renderButton('C', clear, styles.clearButton, styles.clearText)}
          {renderButton('±', toggleSign, styles.functionButton)}
          {renderButton('%', inputPercent, styles.functionButton)}
          {renderButton('÷', () => performOperation('÷'), styles.operatorButton, styles.operatorText)}
        </View>

        <View style={styles.row}>
          {renderButton('7', () => inputDigit('7'))}
          {renderButton('8', () => inputDigit('8'))}
          {renderButton('9', () => inputDigit('9'))}
          {renderButton('×', () => performOperation('×'), styles.operatorButton, styles.operatorText)}
        </View>

        <View style={styles.row}>
          {renderButton('4', () => inputDigit('4'))}
          {renderButton('5', () => inputDigit('5'))}
          {renderButton('6', () => inputDigit('6'))}
          {renderButton('-', () => performOperation('-'), styles.operatorButton, styles.operatorText)}
        </View>

        <View style={styles.row}>
          {renderButton('1', () => inputDigit('1'))}
          {renderButton('2', () => inputDigit('2'))}
          {renderButton('3', () => inputDigit('3'))}
          {renderButton('+', () => performOperation('+'), styles.operatorButton, styles.operatorText)}
        </View>

        <View style={styles.row}>
          {renderButton('0', () => inputDigit('0'))}
          {renderButton('.', inputDecimal)}
          {renderButton('backspace', backspace)}
          {renderButton('=', calculate, styles.equalsButton, styles.equalsText)}
        </View>
      </View>
    </SafeAreaView>
  );
}
