import React, { useMemo, useState } from 'react';
import styled from '@emotion/styled';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { restaurantAPI } from '../services/api';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { authAPIService } from '../services/authApi';

const Container = styled.div`
  padding: 2rem 0;
`;

const TabContainer = styled.div`
  margin-bottom: 2rem;
`;

const TabButton = styled.button`
  padding: 0.75rem 1.5rem;
  border: none;
  background: ${props => props.active ? '#667eea' : '#f5f5f5'};
  color: ${props => props.active ? 'white' : '#333'};
  cursor: pointer;
  border-radius: 8px 8px 0 0;
  margin-right: 0.5rem;
  font-weight: 600;
  
  &:hover {
    background: ${props => props.active ? '#5a67d8' : '#e0e0e0'};
  }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 2rem;
`;

const Panel = styled.div`
  background: white;
  border-radius: 12px;
  padding: 1rem;
`;

const Title = styled.h2`
  margin-bottom: 1rem;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.95rem;
  th, td { border-bottom: 1px solid #eee; padding: 0.5rem; text-align: left; }
  th { background: #fafafa; }
  tr:hover { background: #fafafa; }
`;

const Actions = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const Button = styled.button`
  padding: 0.4rem 0.75rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  background: white;
  cursor: pointer;
  &:hover { background: #f5f5f5; }
`;

const Danger = styled(Button)`
  color: #ff4757;
  border-color: #ffb3ba;
`;

const FormRow = styled.div`
  display: grid;
  grid-template-columns: 120px 1fr;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
`;

const Input = styled.input`
  width: 100%;
  padding: 0.6rem;
  border: 1px solid #ddd;
  border-radius: 6px;
`;

const Textarea = styled.textarea`
  width: 100%;
  padding: 0.6rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  min-height: 80px;
`;

const Select = styled.select`
  width: 100%;
  padding: 0.6rem;
  border: 1px solid #ddd;
  border-radius: 6px;
`;

// 사용자 유형 배지 스타일
const UserTypeBadge = styled.span`
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-size: 0.875rem;
  color: white;
  background: ${props => props.isAdmin ? '#ff6b35' : '#667eea'};
`;

const ProviderBadge = styled.span`
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-size: 0.875rem;
  color: white;
  background: ${props => {
    switch (props.provider) {
      case 'google': return '#db4437';
      case 'naver': return '#03c75a';
      default: return '#667eea';
    }
  }};
`;

function AdminPage() {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState(null);
  const [activeTab, setActiveTab] = useState('restaurants');

  const { data, isLoading, error } = useQuery({
    queryKey: ['restaurants'],
    queryFn: restaurantAPI.getRestaurants,
  });

  const { data: usersData, isLoading: usersLoading, error: usersError } = useQuery({
    queryKey: ['users'],
    queryFn: authAPIService.getAllUsers,
    enabled: activeTab === 'users',
    retry: 1,
  });

  const restaurants = data?.data || [];
  const users = usersData?.data?.users || [];

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { isSubmitting },
  } = useForm();

  const createMutation = useMutation({
    mutationFn: restaurantAPI.createRestaurant,
    onSuccess: () => {
      toast.success('생성 완료');
      queryClient.invalidateQueries({ queryKey: ['restaurants'] });
      reset();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => restaurantAPI.updateRestaurant(id, payload),
    onSuccess: () => {
      toast.success('수정 완료');
      queryClient.invalidateQueries({ queryKey: ['restaurants'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => restaurantAPI.deleteRestaurant(id),
    onSuccess: () => {
      toast.info('삭제 완료');
      queryClient.invalidateQueries({ queryKey: ['restaurants'] });
      if (selected?.id) setSelected(null);
    },
  });

  const changeUserTypeMutation = useMutation({
    mutationFn: ({ userId, userType }) => authAPIService.changeUserType(userId, userType),
    onSuccess: () => {
      toast.success('사용자 유형이 변경되었습니다.');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const onEdit = (row) => {
    setSelected(row);
    setValue('name', row.name);
    setValue('category', row.category);
    setValue('location', row.location);
    setValue('priceRange', row.priceRange || '');
    setValue('rating', row.rating ?? 0);
    setValue('description', row.description || '');
    setValue('recommendedMenu', (row.recommendedMenu || []).join(', '));
    setValue('image', row.image || '');
  };

  const onResetForm = () => {
    setSelected(null);
    reset();
  };

  const onSubmit = async (form) => {
    const recommendedMenu = typeof form.recommendedMenu === 'string'
      ? form.recommendedMenu.split(/[\n,]/).map((s) => s.trim()).filter(Boolean)
      : [];

    const payload = {
      name: form.name?.trim(),
      category: form.category,
      location: form.location?.trim(),
      priceRange: form.priceRange?.trim() || undefined,
      rating: form.rating !== '' && form.rating !== undefined ? Number(form.rating) : undefined,
      description: form.description?.trim() || undefined,
      recommendedMenu: recommendedMenu.length ? recommendedMenu : undefined,
      image: form.image?.trim() || undefined,
    };

    if (selected?.id) {
      await updateMutation.mutateAsync({ id: selected.id, payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
  };

  const onDelete = async (row) => {
    if (!confirm(`[삭제] ${row.name}을(를) 삭제할까요?`)) return;
    await deleteMutation.mutateAsync(row.id);
  };

  const onChangeUserType = async (user, newUserType) => {
    const userTypeText = newUserType === 'admin' ? '관리자' : '일반 사용자';
    if (!confirm(`${user.name}님의 유형을 ${userTypeText}로 변경할까요?`)) return;
    
    try {
      await changeUserTypeMutation.mutateAsync({ userId: user._id, userType: newUserType });
    } catch (error) {
      toast.error(error.userMessage || '사용자 유형 변경에 실패했습니다.');
    }
  };

  const categories = useMemo(() => ['한식','중식','일식','양식','아시안','분식','카페','기타'], []);

  if (isLoading || usersLoading) {
    return (
      <Container>
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <div className="loading-spinner"></div>
          <p>로딩 중...</p>
        </div>
      </Container>
    );
  }
  
  if (error || usersError) {
    return (
      <Container>
        <div className="error-container">
          <h2>오류가 발생했습니다</h2>
          <p>{error?.message || usersError?.message}</p>
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <Title>관리자 페이지</Title>
      
      <TabContainer>
        <TabButton 
          active={activeTab === 'restaurants'} 
          onClick={() => setActiveTab('restaurants')}
        >
          레스토랑 관리
        </TabButton>
        <TabButton 
          active={activeTab === 'users'} 
          onClick={() => setActiveTab('users')}
        >
          사용자 관리
        </TabButton>
      </TabContainer>

      {activeTab === 'restaurants' && (
        <Grid>
        <Panel>
          <Table>
            <thead>
              <tr>
                <th>ID</th>
                <th>이름</th>
                <th>카테고리</th>
                <th>평점</th>
                <th>위치</th>
                <th>액션</th>
              </tr>
            </thead>
            <tbody>
              {restaurants.map((r) => (
                <tr key={r.id}>
                  <td>{r.id}</td>
                  <td>{r.name}</td>
                  <td>{r.category}</td>
                  <td>{r.rating}</td>
                  <td>{r.location}</td>
                  <td>
                    <Actions>
                      <Button onClick={() => onEdit(r)}>수정</Button>
                      <Danger onClick={() => onDelete(r)}>삭제</Danger>
                    </Actions>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Panel>

        <Panel>
          <h3>{selected ? `수정: ${selected.name}` : '새 레스토랑 추가'}</h3>
          <form onSubmit={handleSubmit(onSubmit)}>
            <FormRow>
              <label htmlFor="name">이름 *</label>
              <Input id="name" {...register('name', { required: '이름은 필수입니다' })} />
            </FormRow>
            <FormRow>
              <label htmlFor="category">카테고리 *</label>
              <Select id="category" {...register('category', { required: '카테고리는 필수입니다' })}>
                <option value="">선택</option>
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </Select>
            </FormRow>
            <FormRow>
              <label htmlFor="location">위치 *</label>
              <Input id="location" {...register('location', { required: '위치는 필수입니다' })} />
            </FormRow>
            <FormRow>
              <label htmlFor="priceRange">가격대</label>
              <Input id="priceRange" {...register('priceRange')} />
            </FormRow>
            <FormRow>
              <label htmlFor="rating">평점</label>
              <Input id="rating" type="number" step="0.01" min="0" max="5" {...register('rating')} />
            </FormRow>
            <FormRow>
              <label htmlFor="recommendedMenu">추천 메뉴</label>
              <Textarea id="recommendedMenu" {...register('recommendedMenu')} placeholder="쉼표 또는 줄바꿈으로 구분" />
            </FormRow>
            <FormRow>
              <label htmlFor="image">이미지 URL</label>
              <Input id="image" {...register('image')} />
            </FormRow>
            <FormRow>
              <label htmlFor="description">설명</label>
              <Textarea id="description" {...register('description')} />
            </FormRow>
            <Actions>
              <Button type="submit" disabled={isSubmitting}>{selected ? '수정' : '생성'}</Button>
              <Button type="button" onClick={onResetForm}>초기화</Button>
            </Actions>
          </form>
        </Panel>
        </Grid>
      )}

      {activeTab === 'users' && (
        <Panel>
          <h3>사용자 목록</h3>
          <Table>
            <thead>
              <tr>
                <th>이름</th>
                <th>이메일</th>
                <th>계정 종류</th>
                <th>사용자 유형</th>
                <th>가입일</th>
                <th>액션</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user._id}>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>
                    <ProviderBadge provider={user.provider}>
                      {user.provider === 'google' ? '구글' : 
                       user.provider === 'naver' ? '네이버' : '이메일'}
                    </ProviderBadge>
                  </td>
                  <td>
                    <UserTypeBadge isAdmin={user.userType === 'admin'}>
                      {user.userType === 'admin' ? '관리자' : '일반 사용자'}
                    </UserTypeBadge>
                  </td>
                  <td>{new Date(user.createdAt).toLocaleDateString('ko-KR')}</td>
                  <td>
                    <Actions>
                      {user.userType === 'admin' ? (
                        <Button onClick={() => onChangeUserType(user, 'user')}>
                          일반 사용자로 변경
                        </Button>
                      ) : (
                        <Button onClick={() => onChangeUserType(user, 'admin')}>
                          관리자로 변경
                        </Button>
                      )}
                    </Actions>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Panel>
      )}
    </Container>
  );
}

export default AdminPage;

