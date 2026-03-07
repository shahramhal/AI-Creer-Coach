'use client';

import { useState } from 'react';
import { MoreHorizontal, ShieldCheck, ShieldOff, Ban, CheckCircle, KeyRound, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { adminService } from '@/services/admin.service';
import type { AdminUser } from '@/types/admin.types';

interface Props {
  user: AdminUser;
  onActionComplete: () => void;
}

export function UserActions({ user, onActionComplete }: Props) {
  const [confirmAction, setConfirmAction] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const executeAction = async () => {
    setActionLoading(true);
    try {
      switch (confirmAction) {
        case 'disable':
          await adminService.toggleUserStatus(user.id, true);
          break;
        case 'enable':
          await adminService.toggleUserStatus(user.id, false);
          break;
        case 'promote':
          await adminService.promoteUser(user.id);
          break;
        case 'demote':
          await adminService.demoteUser(user.id);
          break;
        case 'resetPassword':
          await adminService.forceResetPassword(user.id);
          break;
        case 'delete':
          await adminService.deleteUser(user.id);
          break;
      }
      onActionComplete();
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Action failed';
      alert(message);
    } finally {
      setActionLoading(false);
      setConfirmAction(null);
    }
  };

  const getConfirmationText = () => {
    switch (confirmAction) {
      case 'disable':
        return { title: 'Disable User', description: `This will prevent ${user.email} from logging in.` };
      case 'enable':
        return { title: 'Enable User', description: `This will restore ${user.email}'s access.` };
      case 'promote':
        return { title: 'Promote to Admin', description: `This will give ${user.email} full admin access.` };
      case 'demote':
        return { title: 'Demote to User', description: `This will remove admin access from ${user.email}.` };
      case 'resetPassword':
        return { title: 'Force Password Reset', description: `This will generate a password reset token for ${user.email}.` };
      case 'delete':
        return { title: 'Delete User', description: `This will permanently delete ${user.email} and all their data. This cannot be undone.` };
      default:
        return { title: '', description: '' };
    }
  };

  const confirmation = getConfirmationText();

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {user.isDisabled ? (
            <DropdownMenuItem onClick={() => setConfirmAction('enable')}>
              <CheckCircle className="mr-2 h-4 w-4" />
              Enable
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={() => setConfirmAction('disable')}>
              <Ban className="mr-2 h-4 w-4" />
              Disable
            </DropdownMenuItem>
          )}
          {user.role === 'USER' ? (
            <DropdownMenuItem onClick={() => setConfirmAction('promote')}>
              <ShieldCheck className="mr-2 h-4 w-4" />
              Promote to Admin
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={() => setConfirmAction('demote')}>
              <ShieldOff className="mr-2 h-4 w-4" />
              Demote to User
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={() => setConfirmAction('resetPassword')}>
            <KeyRound className="mr-2 h-4 w-4" />
            Reset Password
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setConfirmAction('delete')}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete User
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmation.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmation.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeAction}
              disabled={actionLoading}
              className={confirmAction === 'delete' ? 'bg-destructive hover:bg-destructive/90' : ''}
            >
              {actionLoading ? 'Processing...' : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
