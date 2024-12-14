import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Button, Image, PermissionsAndroid, Platform, StyleSheet, Text, View } from 'react-native';
import { ImagePickerResponse, launchCamera, launchImageLibrary } from 'react-native-image-picker';
import Geolocation, { GeolocationResponse } from "@react-native-community/geolocation";
import { addDoc, collection, doc, getDoc } from 'firebase/firestore';
import { firestoreDB, storage } from './firebaseConfig';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { addListenerOnNotification, registerForPushNotificationsAsync, sendPushNotification } from './notificationConfig';
import { Provider } from 'react-redux';
import { addFailed, addSuccess, store, useAppDispatch, useAppSelector } from './android/app/src/redux';

const noImage = require("./assets/no_img.jpg");

interface FBData {
  first: string;
  last: string;
  born: number;
  imageUrl?: string;
  lat?: number;
  long?: number;
}

function App() {
  const dispatch = useAppDispatch();
  const attemptCounter = useAppSelector(state => state.attemptCounter);

  const [uri, setUri] = useState<string | null>(null);
  const [coords, setCoords] = useState<GeolocationResponse["coords"] | null>(null);
  const [notificationToken, setNotificationToken] = useState<string | null>(null);

  useEffect(() => {
    async function notify(){
      const token = await registerForPushNotificationsAsync();

      if(token)
        console.log("Notification token: " + token);
      else
        console.log("No notification token found");

      setNotificationToken(token ?? null);
    }

    notify();
  })

  const addData = async() => {
    try{
      // listener for notification when the app is open
      addListenerOnNotification((unsubscribe) => {
        console.log("Unsubscribing...");
        unsubscribe();
      });

      const data: FBData = {
        first: "Nayla Mutiara",
        last: "Salsabila Bastari",
        born: 2005,
      };

      // if uri is defined, add to storage first then use the download url
      if(uri){
        console.log("Uploading image to storage...");
        
        console.log(`reading file: ${uri}`);
        const ext = uri?.split(".").pop();
        const file = await fetch(uri);
        const fileBlob = await file.blob();
        
        const imgRef = ref(storage, `test-app/newImage.${ext}`);
        
        console.log("uploading file...");
        const imgUrl = await uploadBytes(imgRef, fileBlob, {contentType: `image/${ext}`});
        console.log("File uploaded to storage: " + imgUrl.ref.fullPath);
        
        data.imageUrl = await getDownloadURL(imgUrl.ref);

        console.log("Image uploaded to storage: " + data.imageUrl);
      }

      if(coords){
        data.lat = coords.latitude;
        data.long = coords.longitude;
      }

      const docRef = await addDoc(collection(firestoreDB, "users"), data);
      const insertedData = await getDoc(doc(firestoreDB, "users", docRef.id));
      dispatch(addFailed());

      if(notificationToken && insertedData.exists()){
        console.log(`data: ${JSON.stringify(insertedData.data())}`);
        sendPushNotification(notificationToken, `${attemptCounter.successAttempts} success attempts, ${attemptCounter.failedAttempts} failed attempts`);
      }
      else
        console.log("No notification token found, unable to send notification");

      console.log("Document written with ID: ", docRef.id);
    }
    catch(err){
      dispatch(addSuccess());
      console.error("Error adding document: ", err);
    }
  }
  
  const hasLocationPermission = async () => {
    // android below 23 doesn't need permission
    if(Platform.OS === "android" && Platform.Version < 23)
      return true;

    const hasPermission = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
    );

    if(hasPermission)
      return true;

    const status = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
    );

    if(status === PermissionsAndroid.RESULTS.GRANTED)
      return true;

    if(status === PermissionsAndroid.RESULTS.DENIED)
      console.log("Location Permission Denied by User");
    else if (status === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN)
      console.log("Location Permission Revoked by User");

    return false;
  }
  
  const getLocation = async() => {
    const hasPermission = await hasLocationPermission();

    if(!hasPermission)
      return;

    Geolocation.setRNConfiguration({
      skipPermissionRequests: true,
    });

    Geolocation.getCurrentPosition((position) => {
      setCoords(position.coords);
    }, (error) => {
      console.error(`Code ${error.code}: ${error.message}`);
      console.log(error);
    }, {
      timeout: 15000,
      maximumAge: 10000,
      distanceFilter: 0,
      enableHighAccuracy: false,
    });
  }

  const openImagePicker = () => {
    launchImageLibrary(
      {
        mediaType: 'photo',
        includeBase64: false,
        maxHeight: 2000,
        maxWidth: 2000,
      },
      handleResponse
    )
  };

  const handleCameraLaunch = () => {
    launchCamera(
      {
        mediaType: "photo",
        includeBase64: false,
        maxHeight: 2000,
        maxWidth: 2000,
      },
      handleResponse
    );
  }

  const requestCameraPermission = async () => {
    try{
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: "Camera Permission",
            message: "This app needs access to your camera to take photos",
            buttonNeutral: "Ask Me Later",
            buttonNegative: "Cancel",
            buttonPositive: "OK"
          }
        );
        
        if(granted === PermissionsAndroid.RESULTS.GRANTED){
          console.log("Camera Permission Granted");
          handleCameraLaunch();
        }
        else
          console.log("Camera Permission Denied");

    }
    catch(e){
      console.warn(e);
    }
  }

  const handleResponse = (response: ImagePickerResponse) => {
    if(response.didCancel)
      console.log("User cancelled image picker");
    else if(response.errorCode)
      console.log(`ImagePicker Error [${response.errorCode}]: ${response.errorMessage}`);
    else if(response.assets && response.assets.length > 0){
      const imgUri = response.assets[0].uri;

      if(imgUri){
        console.log("Image URI: " + imgUri);
        setUri(imgUri);
      }
      else
        console.log("No uri found in the response");
    }
    else
      console.log("No assets found in the response");
  }

  return (
    <View style={styles.container}>
      <Text>Nayla Mutiara Salsabila Bastari - 00000075205</Text>
      <Image source={uri ? {uri} : noImage} style={{width: 200, height: 200}}/>
      <Text>{coords ? `Lat: ${coords.latitude}, Long: ${coords.longitude}` : "No location"}</Text>
      <Button title="GET LOCATION" onPress={getLocation} />
      <Button title="OPEN CAMERA" onPress={requestCameraPermission} />
      <Button title="OPEN GALERY" onPress={openImagePicker} />
      <Button title="SAVE FILE" onPress={addData} />
      <Button title="CLEAR" onPress={() => setUri(null)} />
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
});

export default function ReduxWrapper(){
  return (
    <Provider store={store}>
      <App />
    </Provider>
  );
}