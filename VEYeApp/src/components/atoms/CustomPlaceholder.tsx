import React from 'react'
import {Placeholder, PlaceholderMedia, PlaceholderLine} from 'rn-placeholder'
import {View} from 'react-native'
import {SIZES} from '../../constants'
// type Props = {
//   left?: boolean,
// }

export default function CustomPlaceholder({left = false}) {
  if (left) {
    return (
      <View>
        {[1, 2, 3].map((item, index) => (
          <View
            key={index}
            style={{
              width: SIZES.width,
              padding: SIZES.padding,
            }}>
            <Placeholder Left={PlaceholderMedia}>
              <PlaceholderLine width={30} />
              <PlaceholderLine />
              <PlaceholderLine />
              <PlaceholderLine width={80} />
            </Placeholder>
          </View>
        ))}
      </View>
    )
  } else {
    return (
      <View>
        {[1, 2, 3].map((item, index) => (
          <View
            key={index}
            style={{
              width: SIZES.width,
              padding: SIZES.padding,
            }}>
            <Placeholder Right={PlaceholderMedia}>
              <PlaceholderLine width={30} />
              <PlaceholderLine />
              <PlaceholderLine />
              <PlaceholderLine width={80} />
            </Placeholder>
          </View>
        ))}
      </View>
    )
  }
}
