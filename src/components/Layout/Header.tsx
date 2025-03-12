// src/components/Layout/Header.tsx
import styled from 'styled-components';

const HeaderContainer = styled.header`
  background-color: #232f3e;
  color: white;
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
`;

const UserSection = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const SignOutButton = styled.button`
  background-color: #ff9900;
  color: #232f3e;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s;

  &:hover {
    background-color: #ffac31;
  }
`;

const Username = styled.span`
  font-weight: 500;
`;

interface HeaderProps {
  username?: string;
  onSignOut: () => void;
}

export const Header: React.FC<HeaderProps> = ({ username, onSignOut }) => {
  return (
    <HeaderContainer>
      <h1>QuickSight RLS Dashboard</h1>
      <UserSection>
        <Username>Hello, {username}</Username>
        <SignOutButton onClick={onSignOut}>Sign Out</SignOutButton>
      </UserSection>
    </HeaderContainer>
  );
};
