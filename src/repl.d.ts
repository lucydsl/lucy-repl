import type {StateMachine} from 'xstate';

interface CreateMachineOptions {
  actions: any;
  services: any;
}

export type ReplMachine = StateMachine<any, any, any>;

export default function({ actions, services }: CreateMachineOptions): ReplMachine;