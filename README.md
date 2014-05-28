#Hubic Sync Status Web GUI

***This project is currently discontinued due to the Hubic service / client being far too unreliable***

The aim of this project is to create a nodejs app to handle the running of the Hubic sync client on a ubuntu server and outputing the current status as a web-based GUI.

Hubic is cheap cloud storage provided by OVH, [https://hubic.com](https://hubic.com)

###Caveats

- Currently due to the state of the Sync client the data returned can be inaccurate (i.e. the total usage), Hopefully as the platform improves so will the quality and amount of data available.
- The usage of the session dbus means that if the GUI isnt running in exactly the same session (ssh connect, screen etc) as the client was setup it will not be able to get data.

###Todo

- Add DBUS handling (Making sure its up and running correctly)
- Add control for the hubic daemon
- Error handling
- Transfer queue history
