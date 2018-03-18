import * as util from "../common/utils";

function mySettings(props) {
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
          label="Show battery level screen"
          settingsKey="showBatteryLevel"
        />
      </Section>
    </Page>
  );
}

registerSettingsPage(mySettings);