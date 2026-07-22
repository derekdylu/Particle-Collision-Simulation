# Hardware integration

The hardware components are not needed for the browser simulation. Their code is preserved without functional changes from the private source repositories.

## Arduino catcher

`baseball-arduino/Baseball-Catcher.ino` is the original catcher firmware. The matching serial-port configuration remains in the backend source as it was used on the lab machine.

## Syntec arm bridge

The arm bridge targets .NET Framework 4.8 on x86 Windows and listens on loopback only. It requires proprietary Syntec libraries, which are intentionally not included.

1. Obtain the SDK through an authorized Syntec distribution channel.
2. Restore the licensed vendor libraries to the location expected by the original project file.
3. Review the machine-specific controller address in `Program.cs` before building or running.
4. Start the bridge only on the same trusted machine as the Python backend and with the original emergency-stop procedure available.

The private UTILS README, local startup script, generated Visual Studio state, build output, vendor DLLs, and vendor example project are intentionally omitted from this public snapshot.
