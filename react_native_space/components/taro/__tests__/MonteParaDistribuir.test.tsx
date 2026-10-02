import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { MonteParaDistribuir } from '../MonteParaDistribuir';

describe('MonteParaDistribuir', () => {
  it('diz de onde se pega', () => {
    render(<MonteParaDistribuir restantes={19} aoPuxar={jest.fn()} />);
    expect(screen.getByText('Pegue daqui')).toBeTruthy();
  });

  it('tocar puxa uma carta', () => {
    const aoPuxar = jest.fn();
    render(<MonteParaDistribuir restantes={19} aoPuxar={aoPuxar} />);
    fireEvent.press(screen.getByLabelText('Carta de cima do monte, pegue daqui'));
    expect(aoPuxar).toHaveBeenCalledTimes(1);
  });

  it('monte vazio não puxa nada e diz que acabou', () => {
    const aoPuxar = jest.fn();
    render(<MonteParaDistribuir restantes={0} aoPuxar={aoPuxar} />);
    expect(screen.getByText('Monte vazio')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Carta de cima do monte, pegue daqui'));
    expect(aoPuxar).not.toHaveBeenCalled();
  });
});
