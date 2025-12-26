// Socket instance manager for global access
let socketInstance: any = null;

export const setSocketInstance = (socket: any) => {
  socketInstance = socket;
};

export const getSocketInstance = () => {
  return socketInstance;
};

export const disconnectSocket = () => {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
};
