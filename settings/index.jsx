import * as util from "../common/utils";
let propsForReset

function mySettings(props) {
  propsForReset = props
  return (
    <Page>
      <Section
        title={<Text bold align="center">Day Maker Settings</Text>}>
        <Text>
           Set the time for the alarm to go off and the number of steps you would like it to take for it to deactivate.
        </Text>
        <TextInput
          label="Hour (24 hours)"
          settingsKey="hour"
          type="number"
          placeholder="8"
        />          
        
        <TextInput
          label="Minute"
          settingsKey="minute"
          type="number"
          placeholder="0"
        />          
        
        <TextInput
          label="Steps"
          settingsKey="steps"
          type="number"
          placeholder="20"
        />
        
        <Toggle
          label="Show heart rate"
          settingsKey="showheartrate"
        />
        
        <Toggle
          label="Disable alarm"
          settingsKey="disableAlarm"
        />
        
        <Toggle
          label="No alarm while taking steps"
          settingsKey="silentInProgress"
        />
        
        <Text>
          Your Fitbit will not vibrate while you are actively taking steps for your alarm.
        </Text>
        
        <Toggle
          label="Show battery level screen"
          settingsKey="showBatteryLevel"
        />
        
        <Toggle
          label="Time adjust screen"
          settingsKey="adjustBrightness"
        />
        <Text>
          Changes font / bar colors to be easier on the eyes at night.
        </Text>
        
        <Toggle
          label="Enable bedtime fitbit logo counting"
          settingsKey="logocounting"
          />
        
        <TextInput
          label="Bedtime (24 hour format)"
          settingsKey="bedtime"
          type="number"
          placeholder="22"
        />
        
        <Text>
           Fitbit logos slowly float across the screen, count them to help fall asleep. Bedtime in hours (24 hour format.)
        </Text>
        
        <Toggle
          label="Show sunrise wakeup image"
          settingsKey="showWakeupImage"
        />
        
        <Text>
           Shows a random, nice sunrise image. Images provided from https://unsplash.com/
        </Text>

      </Section>
    </Page>
  );
}

try {
  registerSettingsPage(mySettings); 
} catch (e) {
  console.log('reset settings because incompatible settings existed pre-update (nonupgradeable)')
  propsForReset.settingsStorage.clear()
  registerSettingsPage(mySettings); 
}