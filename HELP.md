**Midas MR18 / Behringer XR 12/16/18**

This Module controls the Midas MR series and Behringer XR series of consoles
go over to [Midas](http://www.musictri.be/Categories/Midas/Mixers/Digital/M32/p/P0B3I) or [Behringer](http://www.musictri.be/Categories/Behringer/Mixers/Digital/X32/p/P0ASF)
to get additional information about the consoles and their capabilities.

## Configuration
**Target IP:** Enter the IP address of the Mixer

## Supported Actions
Console Function | What it does
-----------------|---------------
Channel, USB, FX Send, Fx Return, Bus and Main mute | Mutes or Unmutes the selected Channel, USB, FX Send, Fx Return, Bus and Main
Channel, USB, FX Send, Fx Return, Bus and Main fader | Sets the level of the selected Channel, Channel, USB, FX Send, Fx Return, Bus and Main fader
Channel, USB, FX Send, Fx Return, Bus and Main label | Sets the text label in the scribble strip of the selected Channel, USB, FX Send, Fx Return, Bus and Main
Channel, USB, FX Send, Fx Return, Bus and Main color | Sets the color of the scribble strip of the selected Channel, USB, FX Send, Fx Return, Bus and Main
Mute Group | Turns the selected mute group on or off
Load Console Snapshot | Loads the given Snapshot from the consoles internal Snapshot list 1-64
Tape Operation | Stop,Play,PlayPause,Record,RecordPause,Fast Forward,Rewind of the tape Deck
Bus sends | Bus sends for channels
**Note:** All mute actions also have a Toggle option that inverts the current state of the board channel

## Dynamic Variables
Variable | Description
-----------------|---------------
**$(INSTANCENAME:m_name)** | Mixer Name
**$(INSTANCENAME:m_model)** | Mixer Model
**$(INSTANCENAME:m_fw)** | Mixer Firmware
**$(INSTANCENAME:s_name)** | Current Snapshot Name
**$(INSTANCENAME:s_index)** | Current Snapshot Number

## Feedback
Variable | Description
-----------------|---------------
**Color when Current Snapshot** | Sets the button color if the Selected snapshot is loaded
**Color when Channel muted** | Sets the button color if the selected channel is muted (Channel/Bus/DCA/FX send/FX return)
**Color when Main LR muted** | Sets the button color if the Main LR is muted
**Color when USB/Aux in muted** | Sets the button color if the USB/Aux in is muted
**Color when Mute Group on** | Sets the button color if the selected Mute Group is on

## Notes
Channel ranges are maximums (compatible with the X18). If you have an X12 or X16 invalid channels are ignored.

for additional actions please raise a feature request at [github](https://github.com/bitfocus/companion)
