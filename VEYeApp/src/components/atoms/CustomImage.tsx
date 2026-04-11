import BetterImage from 'react-native-better-image'

export default function CustomImage({style, url}: any) {
  return (
    <BetterImage
      viewStyle={style}
      source={{
        uri: url,
      }}
      thumbnailSource={{
        uri: 'https://curricula.unc.edu/wp-content/uploads/sites/1311/2022/07/avatar.png',
      }}
      fallbackSource={{
        uri: 'https://curricula.unc.edu/wp-content/uploads/sites/1311/2022/07/avatar.png',
      }}
      resizeMode="cover"
    />
  )
}
