// src/renderer/components/Editor/PlainKonvaText.tsx
/**
 * Thin forwardRef wrapper around Konva <Text> so we can get a
 * Konva.Text ref from both the plain and rich-text branches of
 * EditableText without duplicating prop wiring.
 */
import React, { forwardRef } from 'react';
import { Text } from 'react-konva';
import Konva from 'konva';

type Props = React.ComponentProps<typeof Text>;

const PlainKonvaText = forwardRef<Konva.Text, Props>((props, ref) => (
  <Text ref={ref} {...props} />
));

PlainKonvaText.displayName = 'PlainKonvaText';
export default PlainKonvaText;