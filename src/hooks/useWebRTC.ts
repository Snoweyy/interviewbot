import { useState, useEffect, useRef } from 'react'

export interface WebRTCState {
  isConnected: boolean
  localStream: MediaStream | null
  remoteStream: MediaStream | null
  isAudioEnabled: boolean
  connectionState: RTCPeerConnectionState
}

export function useWebRTC() {
  const [state, setState] = useState<WebRTCState>({
    isConnected: false,
    localStream: null,
    remoteStream: null,
    isAudioEnabled: true,
    connectionState: 'new'
  })
  
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const wsRef = useRef<WebSocket | null>(null)

  const initializePeerConnection = () => {
    const configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    }

    const peerConnection = new RTCPeerConnection(configuration)
    peerConnectionRef.current = peerConnection

    // Handle incoming streams
    peerConnection.ontrack = (event) => {
      setState(prev => ({
        ...prev,
        remoteStream: event.streams[0]
      }))
    }

    // Handle connection state changes
    peerConnection.onconnectionstatechange = () => {
      setState(prev => ({
        ...prev,
        connectionState: peerConnection.connectionState
      }))
    }

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate && wsRef.current) {
        wsRef.current.send(JSON.stringify({
          type: 'ice-candidate',
          candidate: event.candidate
        }))
      }
    }

    return peerConnection
  }

  const startLocalStream = async (constraints?: MediaStreamConstraints) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
          channelCount: 1
        },
        video: false,
        ...constraints
      })

      localStreamRef.current = stream
      setState(prev => ({
        ...prev,
        localStream: stream
      }))

      // Add local stream to peer connection
      if (peerConnectionRef.current) {
        stream.getTracks().forEach(track => {
          peerConnectionRef.current?.addTrack(track, stream)
        })
      }

      return stream
    } catch (error) {
      console.error('Error accessing media devices:', error)
      throw error
    }
  }

  const createOffer = async () => {
    if (!peerConnectionRef.current) {
      throw new Error('Peer connection not initialized')
    }

    try {
      const offer = await peerConnectionRef.current.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: false
      })

      await peerConnectionRef.current.setLocalDescription(offer)
      return offer
    } catch (error) {
      console.error('Error creating offer:', error)
      throw error
    }
  }

  const createAnswer = async (offer: RTCSessionDescriptionInit) => {
    if (!peerConnectionRef.current) {
      throw new Error('Peer connection not initialized')
    }

    try {
      await peerConnectionRef.current.setRemoteDescription(offer)
      const answer = await peerConnectionRef.current.createAnswer()
      await peerConnectionRef.current.setLocalDescription(answer)
      return answer
    } catch (error) {
      console.error('Error creating answer:', error)
      throw error
    }
  }

  const setRemoteDescription = async (description: RTCSessionDescriptionInit) => {
    if (!peerConnectionRef.current) {
      throw new Error('Peer connection not initialized')
    }

    try {
      await peerConnectionRef.current.setRemoteDescription(description)
    } catch (error) {
      console.error('Error setting remote description:', error)
      throw error
    }
  }

  const addIceCandidate = async (candidate: RTCIceCandidateInit) => {
    if (!peerConnectionRef.current) {
      throw new Error('Peer connection not initialized')
    }

    try {
      await peerConnectionRef.current.addIceCandidate(candidate)
    } catch (error) {
      console.error('Error adding ICE candidate:', error)
      throw error
    }
  }

  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
        setState(prev => ({
          ...prev,
          isAudioEnabled: audioTrack.enabled
        }))
      }
    }
  }

  const stopStream = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        track.stop()
      })
      localStreamRef.current = null
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
      peerConnectionRef.current = null
    }

    setState({
      isConnected: false,
      localStream: null,
      remoteStream: null,
      isAudioEnabled: true,
      connectionState: 'new'
    })
  }

  const connectWebSocket = (url: string) => {
    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      setState(prev => ({ ...prev, isConnected: true }))
    }

    ws.onclose = () => {
      setState(prev => ({ ...prev, isConnected: false }))
    }

    ws.onmessage = async (event) => {
      try {
        const message = JSON.parse(event.data)
        
        switch (message.type) {
          case 'offer':
            const answer = await createAnswer(message.offer)
            ws.send(JSON.stringify({
              type: 'answer',
              answer
            }))
            break
            
          case 'answer':
            await setRemoteDescription(message.answer)
            break
            
          case 'ice-candidate':
            await addIceCandidate(message.candidate)
            break
        }
      } catch (error) {
        console.error('Error handling WebSocket message:', error)
      }
    }

    return ws
  }

  const sendMessage = (message: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message))
    }
  }

  useEffect(() => {
    initializePeerConnection()
    
    return () => {
      stopStream()
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [])

  return {
    ...state,
    startLocalStream,
    createOffer,
    createAnswer,
    setRemoteDescription,
    addIceCandidate,
    toggleAudio,
    stopStream,
    connectWebSocket,
    sendMessage
  }
}