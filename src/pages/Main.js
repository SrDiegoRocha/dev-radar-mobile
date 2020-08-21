import React, { useState, useEffect } from 'react';
import { Image, StyleSheet, View, Text, TextInput, TouchableOpacity, Keyboard } from 'react-native';
import MapView, { Marker, Callout } from 'react-native-maps';
import { requestPermissionsAsync, getCurrentPositionAsync } from 'expo-location'
import { MaterialIcons } from '@expo/vector-icons'

import api from '../services/api'
import { connect, disconnect, subscribeToNewDevs } from '../services/socket'

function Main({ navigation }){
const [devs, setDevs] = useState([])
const [currentRegion, setCurrentRegion] = useState(null)
const [techs, setTechs] = useState('')
const [keyboardON, setKeyboardON] = useState(false);
const [keyboardSize, setKeyboardSize] = useState(0);

useEffect(() => {
    async function loadInicialPosition(){
        const { granted } = await requestPermissionsAsync();

        if(granted){
            const { coords } = await getCurrentPositionAsync({
                enableHighAccuracy: true,
            });

            const {latitude, longitude } = coords;

            setCurrentRegion({
                latitude,
                longitude,
                latitudeDelta: 0.04,
                longitudeDelta: 0.04,
            })
        }
    }
    
    loadInicialPosition()
}, [])

useEffect(() => {
    subscribeToNewDevs(dev => setDevs([...devs, dev]))
}, [devs])

function handleRegionChanged(region){
    setCurrentRegion(region)
}

function setupWebsocket(){
    disconnect();

    const { latitude, longitude } = currentRegion

    connect(
        latitude,
        longitude,
        techs,
    )
}

async function loadDevs(){
    const { latitude, longitude } = currentRegion;

    const response = await api.get('/search', {
        params: {
            latitude,
            longitude,
            techs: techs
        }
    })

    setDevs(response.data.devs)
    setupWebsocket()
}

// Quando o teclado aparecer ele vai setar o estado de 'keyboardON' e a altura no 'setKeyboardSize'.
Keyboard.addListener('keyboardDidShow', (event) => {
  setKeyboardON(true);
  setKeyboardSize(event.endCoordinates.height - 10); // Hackzinho pro teclado não ficar tão longe do input.
});

// Configurações quando o teclado sumir da tela.
Keyboard.addListener('keyboardDidHide', () => {
  setKeyboardON(false);
  setKeyboardSize(0);
});

if(!currentRegion) {
    return null;
}

return (
<>
    <MapView onRegionChangeComplete={handleRegionChanged} onPress={() => Keyboard.dismiss()} initialRegion={currentRegion} style={ style.map }>
        {devs.map(dev => (
            <Marker key={dev._id} coordinate={{ latitude: dev.location.coordinates[1], longitude: dev.location.coordinates[0] }}>
            <Image style={style.avatar} source={{ uri: dev.avatar_url }} />
            
            <Callout onPress={() => {
                navigation.navigate('Profile', { github_username: dev.github_username })
            }}>
                <View style={style.callout}>
                    <Text style={style.devName}>{dev.github_username}</Text>
                    <Text style={style.devBio}>{dev.bio}</Text>
                    <Text style={style.devTechs}>{dev.techs.join(', ')}</Text>
                </View>
            </Callout>
            </Marker>
        ))}
    </MapView>
    <View style={keyboardON ? { bottom: keyboardSize } : style.removeBottom}>
        <View style={style.searchForm}>
            <TextInput style={style.searchInput}
            placeholder="Buscar devs por techs..."
            placeholderTextColor="#999"
            autoCapitalize="words"
            autoCorrect={false}
            value={techs}
            onChangeText={text => setTechs(text)}
            />

            <TouchableOpacity onPress={loadDevs} style={style.loadButton}>
                <MaterialIcons name="my-location" size={20} color="#fff"/>
            </TouchableOpacity>
        </View>
    </View>
</>
)
}

const style = StyleSheet.create({
    map: {
        flex: 1
    },
    avatar: {
        width: 54,
        height: 54,
        borderRadius: 4,
        borderWidth: 4,
        borderColor: '#fff'
    },

    callout: {
        width: 260,
    },

    devName: {
        fontWeight: 'bold',
        fontSize: 16,
    }, 
    devBio: {
        color: '#666',
        marginTop: 5
    },
    devTechs: {
        marginTop: 5,
    },

    searchForm:{
       position: 'absolute',
       bottom: 20,
       left: 20,
       right: 20,
       zIndex: 5,
       flexDirection: 'row'
    },
    searchInput: {
        flex: 1,
        height: 50,
        backgroundColor: '#fff',
        borderRadius: 25,
        paddingHorizontal: 20,
        fontSize: 16,
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowOffset: {
            width: 4,
            height: 4
        },
        elevation: 2, 
    },
    loadButton: {
        width: 50,
        height: 50,
        backgroundColor: '#8e40ff',
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 15,
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowOffset: {
            width: 4,
            height: 4
        },
    },
    removeBottom: {
        bottom: 20,
    }
})

export default Main;