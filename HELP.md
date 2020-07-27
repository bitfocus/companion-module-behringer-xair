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
Channel, USB, FX Send, Fx Return, Bus and Main fader set | Sets the level of the selected Channel, Channel, USB, FX Send, Fx Return, Bus and Main fader
Channel, USB, FX Send, Fx Return, Bus and Main fader adjust | Adjust the selected Channel, Channel, USB, FX Send, Fx Return, Bus and Main fader up or down by steps **see note**
Channel, USB, FX Send, Fx Return, Bus and Main label | Sets the text label in the scribble strip of the selected Channel, USB, FX Send, Fx Return, Bus and Main
Channel, USB, FX Send, Fx Return, Bus and Main color | Sets the color of the scribble strip of the selected Channel, USB, FX Send, Fx Return, Bus and Main
Mute Group | Turns the selected mute group on or off
Load Console Snapshot | Loads the given Snapshot from the consoles internal Snapshot list 1-64
Tape Operation | Stop,Play,PlayPause,Record,RecordPause,Fast Forward,Rewind of the tape Deck
Bus sends | Bus sends for channels

**Note:** All mute actions also have a Toggle option that inverts the current state of the board channel.

**Note:** This module stores fader position as a range from 0 (-oo dB) to 100 (+10dB). The conversion from position to dB is explained below.


## Dynamic Variables
Variable | Description
-----------------|---------------
**$(INSTANCENAME:m_name)** | Mixer Name
**$(INSTANCENAME:m_model)** | Mixer Model
**$(INSTANCENAME:m_fw)** | Mixer Firmware
**$(INSTANCENAME:s_name)** | Current Snapshot Name
**$(INSTANCENAME:s_index)** | Current Snapshot Number
**$(INSTANCENAME:l_lr)** | Label on LR/Main
**$(INSTANCENAME:l_rtn_aux)** | Label on USB/Aux return
**$(INSTANCENAME:l_ch#)** | Label on Channel #
**$(INSTANCENAME:l_bus#)** | Label on Bus Master #
**$(INSTANCENAME:l_dca#)** | Label on DCA #
**$(INSTANCENAME:l_rtn#)** | Label on Return #
**$(INSTANCENAME:l_fxsend#)** | Label on FX Bus Master #
**$(INSTANCENAME:f_lr_d)** | LR/Main Fader dB
**$(INSTANCENAME:f_lr_p)** | LR/Main Fader Percent
**$(INSTANCENAME:f_rtn_aux_d)** | USB/Aux return Fader dB
**$(INSTANCENAME:f_rtn_aux_p)** | USB/Aux return Fader Percent
**$(INSTANCENAME:f_ch#_d)** | Channel # Fader dB
**$(INSTANCENAME:f_ch#_p)** | Channel # Fader Percent
**$(INSTANCENAME:f_bus#_d)** | Bus Master # Fader dB
**$(INSTANCENAME:f_bus#_p)** | Bus Master # Fader Percent
**$(INSTANCENAME:f_dca#_d)** | DCA # Fader dB
**$(INSTANCENAME:f_dca#_p)** | DCA # Fader Percent
**$(INSTANCENAME:f_rtn#_d)** | Return # Fader dB
**$(INSTANCENAME:f_rtn#_p)** | Return # Fader Percent
**$(INSTANCENAME:f_fxsend#_d)** | FX Bus Master # Fader dB
**$(INSTANCENAME:f_fxsend#_p)** | FX Bus Master # Fader Percent


## Feedback
Variable | Description
-----------------|---------------
**Color when Current Snapshot** | Sets the button color if the Selected snapshot is loaded
**Color when Channel muted** | Sets the button color if the selected channel is muted (Channel/Bus/DCA/FX send/FX return)
**Color when Main LR muted** | Sets the button color if the Main LR is muted
**Color when USB/Aux in muted** | Sets the button color if the USB/Aux in is muted
**Color when Mute Group on** | Sets the button color if the selected Mute Group is on
**Color of Channel label** | Sets the button color to match the seleted channel (Channel/Bus/DCA/FX send/FX return) label
**Color of Main LR label** | Sets the button color to match the Main LR label
**Color of USB/Aux label** | Sets the button color to match the USB/Aux label


## Notes
Channel ranges are maximums (compatible with the X18). If you have an X12 or X16 invalid channels are ignored.

For additional actions please raise a feature request at [github](https://github.com/bitfocus/companion)

## Fader steps to dB information
Similar to the X32, XAir faders implement a 4 linear functions approach with cross points at ‐10, ‐30, ‐60 dB to emulate the log function one can expect to manipulate volume data. Fader controls typically follow a log 10 function to match the human perception of loudness. The volume ratio generic formula: dB value = 20 * log (v2/v1) produces a response curve in blue, as below. On the other hand, XAir faders are using 4 different linear functions with increasing slopes to approximate the dB log transfer shape; the figure below shows the 4 different XAir segments in red (labeled X32).

In both representations, 0db maps to 0.75 and 10dB maps to 1.0

![Fader](images/X32-Air-faders.png?raw=true "Fader")

Since the mixer uses 1024 steps per fader, there may be some rounding differences between the mixer display and companion.
