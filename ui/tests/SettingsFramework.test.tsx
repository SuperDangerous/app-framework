import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SettingsFramework, SettingsCategory } from '../components/settings/SettingsFramework';
import { Settings } from 'lucide-react';

describe('SettingsFramework', () => {
  const mockCategories: SettingsCategory[] = [
    {
      id: 'general',
      label: 'General',
      icon: Settings,
      settings: [
        {
          key: 'appName',
          label: 'Application Name',
          type: 'string',
          defaultValue: 'My App',
          validation: (value) => (value.length > 0 ? null : 'Name is required'),
        },
        {
          key: 'port',
          label: 'Port',
          type: 'number',
          defaultValue: 3000,
          validation: (value) =>
            value >= 1024 && value <= 65535 ? null : 'Port must be between 1024 and 65535',
        },
        {
          key: 'apiKey',
          label: 'API Key',
          type: 'password',
          defaultValue: '',
          requiresRestart: true,
        },
      ],
    },
    {
      id: 'advanced',
      label: 'Advanced',
      settings: [
        {
          key: 'debugMode',
          label: 'Debug Mode',
          type: 'boolean',
          defaultValue: false,
          requiresRestart: true,
        },
      ],
    },
  ];

  const mockOnSave = jest.fn().mockResolvedValue(undefined);
  const mockOnLoad = jest.fn().mockResolvedValue({
    appName: 'Test App',
    port: 4000,
    apiKey: 'secret123',
    debugMode: false,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it('renders category navigation', async () => {
    render(<SettingsFramework categories={mockCategories} onSave={mockOnSave} persistState={false} />);

    expect(await screen.findByRole('button', { name: 'General' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Advanced' })).toBeInTheDocument();
  });

  it('loads settings from onLoad', async () => {
    render(
      <SettingsFramework
        categories={mockCategories}
        onSave={mockOnSave}
        onLoad={mockOnLoad}
        persistState={false}
      />
    );

    await waitFor(() => {
      expect(mockOnLoad).toHaveBeenCalledTimes(1);
    });

    const appNameInput = await screen.findByLabelText('Application Name');
    expect((appNameInput as HTMLInputElement).value).toBe('Test App');
  });

  it('validates required fields before save', async () => {
    render(<SettingsFramework categories={mockCategories} onSave={mockOnSave} persistState={false} />);

    const appNameInput = (await screen.findByLabelText('Application Name')) as HTMLInputElement;
    fireEvent.change(appNameInput, { target: { value: '' } });
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(screen.getByText('Name is required')).toBeInTheDocument();
    });
    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it('saves changed settings', async () => {
    render(<SettingsFramework categories={mockCategories} onSave={mockOnSave} persistState={false} />);

    const appNameInput = (await screen.findByLabelText('Application Name')) as HTMLInputElement;
    fireEvent.change(appNameInput, { target: { value: 'New App Name' } });

    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(expect.objectContaining({ appName: 'New App Name' }));
    });
  });

  it('switches between categories', async () => {
    render(<SettingsFramework categories={mockCategories} onSave={mockOnSave} persistState={false} />);

    expect(await screen.findByLabelText('Application Name')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Advanced' }));

    await waitFor(() => {
      expect(screen.getByLabelText(/Debug Mode/i)).toBeInTheDocument();
      expect(screen.queryByLabelText('Application Name')).not.toBeInTheDocument();
    });
  });

  it('calls onRestartRequired for restart-sensitive settings', async () => {
    const onRestartRequired = jest.fn();
    render(
      <SettingsFramework
        categories={mockCategories}
        onSave={mockOnSave}
        onRestartRequired={onRestartRequired}
        persistState={false}
      />
    );

    const apiKeyInput = (await screen.findByLabelText(/API Key/i)) as HTMLInputElement;
    fireEvent.change(apiKeyInput, { target: { value: 'new-key' } });
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(onRestartRequired).toHaveBeenCalledWith(['apiKey']);
    });
  });

  it('auto-saves when enabled', async () => {
    jest.useFakeTimers();

    render(
      <SettingsFramework
        categories={mockCategories}
        onSave={mockOnSave}
        autoSave={true}
        autoSaveDelay={1000}
        persistState={false}
      />
    );

    const appNameInput = (await screen.findByLabelText('Application Name')) as HTMLInputElement;
    fireEvent.change(appNameInput, { target: { value: 'Auto Save Test' } });

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(expect.objectContaining({ appName: 'Auto Save Test' }));
    });

    jest.useRealTimers();
  });

  it('persists active category in localStorage when enabled', async () => {
    const setItemSpy = jest.spyOn(Storage.prototype, 'setItem');

    render(<SettingsFramework categories={mockCategories} onSave={mockOnSave} persistState={true} />);

    await screen.findByLabelText('Application Name');
    fireEvent.click(screen.getByText('Advanced'));

    expect(setItemSpy).toHaveBeenCalledWith('settings-active-category', 'advanced');
  });

  it('supports custom field components', async () => {
    const CustomField = ({ value, onChange }: any) => (
      <input data-testid="custom-field" value={value} onChange={(e) => onChange(e.target.value)} />
    );

    const customCategories: SettingsCategory[] = [
      {
        id: 'custom',
        label: 'Custom',
        settings: [
          {
            key: 'customField',
            label: 'Custom Field',
            type: 'custom',
            customComponent: CustomField,
            defaultValue: 'custom',
          },
        ],
      },
    ];

    render(<SettingsFramework categories={customCategories} onSave={mockOnSave} persistState={false} />);

    expect(await screen.findByTestId('custom-field')).toBeInTheDocument();
  });
});
