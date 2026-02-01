import React, { useMemo } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import {
  Modal,
  Portal,
  Text,
  Button,
  IconButton,
  useTheme,
  Divider,
} from 'react-native-paper';

interface LegalModalProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** Callback when the modal is dismissed */
  onDismiss: () => void;
  /** Title displayed in the modal header */
  title: string;
  /** Content to display (markdown-like format with ## headers and - bullets) */
  content: string;
}

interface ParsedLine {
  type: 'h2' | 'h3' | 'bullet' | 'paragraph' | 'divider' | 'empty';
  text: string;
}

/**
 * Parses markdown-like content into structured lines
 */
function parseContent(content: string): ParsedLine[] {
  const lines = content.split('\n');
  const parsed: ParsedLine[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === '') {
      parsed.push({ type: 'empty', text: '' });
    } else if (trimmed === '---') {
      parsed.push({ type: 'divider', text: '' });
    } else if (trimmed.startsWith('## ')) {
      parsed.push({ type: 'h2', text: trimmed.slice(3) });
    } else if (trimmed.startsWith('### ')) {
      parsed.push({ type: 'h3', text: trimmed.slice(4) });
    } else if (trimmed.startsWith('- ')) {
      parsed.push({ type: 'bullet', text: trimmed.slice(2) });
    } else {
      parsed.push({ type: 'paragraph', text: trimmed });
    }
  }

  return parsed;
}

/**
 * Reusable modal component for displaying legal content (Terms of Service, Privacy Policy).
 * Renders markdown-like content with headers (##), subheaders (###), and bullet points (-).
 */
export function LegalModal({ visible, onDismiss, title, content }: LegalModalProps) {
  const theme = useTheme();

  const parsedContent = useMemo(() => parseContent(content), [content]);

  const renderLine = (line: ParsedLine, index: number) => {
    switch (line.type) {
      case 'h2':
        return (
          <Text
            key={index}
            variant="titleMedium"
            style={[
              styles.heading,
              { color: theme.colors.onSurface },
            ]}
          >
            {line.text}
          </Text>
        );

      case 'h3':
        return (
          <Text
            key={index}
            variant="titleSmall"
            style={[
              styles.subheading,
              { color: theme.colors.onSurface },
            ]}
          >
            {line.text}
          </Text>
        );

      case 'bullet':
        return (
          <View key={index} style={styles.bulletContainer}>
            <Text
              variant="bodyMedium"
              style={[styles.bulletPoint, { color: theme.colors.primary }]}
            >
              {'\u2022'}
            </Text>
            <Text
              variant="bodyMedium"
              style={[styles.bulletText, { color: theme.colors.onSurfaceVariant }]}
            >
              {line.text}
            </Text>
          </View>
        );

      case 'divider':
        return (
          <Divider
            key={index}
            style={[styles.divider, { backgroundColor: theme.colors.outlineVariant }]}
          />
        );

      case 'paragraph':
        return (
          <Text
            key={index}
            variant="bodyMedium"
            style={[styles.paragraph, { color: theme.colors.onSurfaceVariant }]}
          >
            {line.text}
          </Text>
        );

      case 'empty':
        return <View key={index} style={styles.emptyLine} />;

      default:
        return null;
    }
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={[
          styles.modalContainer,
          { backgroundColor: theme.colors.surface },
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text
            variant="titleLarge"
            style={[styles.title, { color: theme.colors.onSurface }]}
          >
            {title}
          </Text>
          <IconButton
            icon="close"
            size={24}
            onPress={onDismiss}
            iconColor={theme.colors.onSurfaceVariant}
            testID="legal-modal-close"
          />
        </View>

        <Divider style={styles.headerDivider} />

        {/* Scrollable Content */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={true}
          testID="legal-modal-scroll"
        >
          {parsedContent.map((line, index) => renderLine(line, index))}
        </ScrollView>

        {/* Footer with Close Button */}
        <View style={styles.footer}>
          <Button
            mode="contained"
            onPress={onDismiss}
            style={styles.closeButton}
            testID="legal-modal-close-button"
          >
            Close
          </Button>
        </View>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    margin: 16,
    borderRadius: 16,
    maxHeight: '85%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontWeight: '600',
    flex: 1,
  },
  headerDivider: {
    marginHorizontal: 20,
  },
  scrollView: {
    flexGrow: 1,
    flexShrink: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 16,
  },
  heading: {
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  subheading: {
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 6,
  },
  bulletContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 4,
    paddingLeft: 8,
  },
  bulletPoint: {
    marginRight: 8,
    fontSize: 16,
    lineHeight: 22,
  },
  bulletText: {
    flex: 1,
    lineHeight: 22,
  },
  paragraph: {
    marginVertical: 4,
    lineHeight: 22,
  },
  divider: {
    marginVertical: 16,
  },
  emptyLine: {
    height: 8,
  },
  footer: {
    padding: 16,
    paddingTop: 8,
  },
  closeButton: {
    borderRadius: 8,
  },
});
